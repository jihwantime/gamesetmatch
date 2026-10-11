import io
import unittest
from datetime import date, timedelta
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory

import pandas as pd
import requests

import fetch_recent as recent


class DownloadTests(unittest.TestCase):
    def response(self, status, content=b"xlsx"):
        response = requests.Response()
        response.status_code = status
        response._content = content
        return response

    @patch.object(recent.time, "sleep")
    @patch.object(recent.requests, "get")
    def test_forbidden_is_not_retried(self, get, sleep):
        get.return_value = self.response(403)
        self.assertIsNone(recent.fetch_with_retry(recent.URL))
        get.assert_called_once()
        sleep.assert_not_called()

    @patch.object(recent.time, "sleep")
    @patch.object(recent.requests, "get")
    def test_transient_error_retries(self, get, sleep):
        get.side_effect = [self.response(503), self.response(200)]
        self.assertEqual(recent.fetch_with_retry(recent.URL), b"xlsx")
        self.assertEqual(get.call_count, 2)
        sleep.assert_called_once_with(5.0)

    def workbook(self, match_date):
        columns = {c: [1] for c in ["Tournament", "Winner", "Loser", "Surface", "Series",
                   "Round", "Best of", "WRank", "LRank", "WPts", "LPts"]}
        columns["Date"] = [match_date]
        stream = io.BytesIO()
        pd.DataFrame(columns).to_excel(stream, index=False)
        return stream.getvalue()

    def test_reject_wrong_year(self):
        with self.assertRaisesRegex(ValueError, "outside"):
            recent.validate_season(self.workbook(date(recent.YEAR - 1, 1, 1)))

    def test_reject_future_matches(self):
        with self.assertRaises(ValueError):
            recent.validate_season(self.workbook(date.today() + timedelta(days=1)))

    def test_valid_workbook(self):
        td = recent.validate_season(self.workbook(date.today()))
        self.assertEqual(len(td), 1)

    @patch.dict(recent.os.environ, {"REQUIRE_RECENT_DATA": "1", "MAX_SOURCE_AGE_DAYS": "21"})
    def test_stale_cached_source_blocks_refresh(self):
        td = pd.DataFrame({"Date": [pd.Timestamp(date.today() - timedelta(days=22))]})
        with self.assertRaisesRegex(ValueError, "refusing refresh"):
            recent.require_fresh_source(td)

    def test_reject_html_error_page(self):
        with self.assertRaises(ValueError):
            recent.validate_season(b"<html>Access denied</html>")

    @patch.dict(recent.os.environ, {"REQUIRE_RECENT_DATA": "1"})
    @patch.object(recent, "fetch_with_retry", return_value=None)
    def test_missing_source_does_not_replace_existing_topup(self, fetch):
        with TemporaryDirectory() as folder, patch.object(recent, "DATA", Path(folder)):
            topup = Path(folder) / "recent_matches.csv"
            topup.write_text("last good topup")
            with self.assertRaises(SystemExit):
                recent.main()
            self.assertEqual(topup.read_text(), "last good topup")

    @patch.object(recent, "fetch_with_retry", return_value=b"<html>Access denied</html>")
    def test_invalid_download_preserves_cached_workbook(self, fetch):
        with TemporaryDirectory() as folder, patch.object(recent, "DATA", Path(folder)):
            cache = Path(folder) / f"tennis_data_{recent.YEAR}.xlsx"
            good = self.workbook(date.today())
            cache.write_bytes(good)
            with patch.object(recent, "build_name_index", side_effect=RuntimeError("stop before conversion")):
                with self.assertRaisesRegex(RuntimeError, "stop before conversion"):
                    recent.main()
            self.assertEqual(cache.read_bytes(), good)


if __name__ == "__main__":
    unittest.main()
