import unittest
from datetime import date, timedelta
from unittest.mock import patch
import load_postgres as loader


class ConvertedDataFreshnessTests(unittest.TestCase):
    @patch.dict(loader.os.environ, {"REQUIRE_RECENT_DATA": "1", "MAX_SOURCE_AGE_DAYS": "21"})
    def test_old_converted_matches_are_rejected(self):
        stale = int((date.today() - timedelta(days=22)).strftime("%Y%m%d"))
        with self.assertRaisesRegex(ValueError, "database was not changed"):
            loader.require_recent_match(stale)

    @patch.dict(loader.os.environ, {"REQUIRE_RECENT_DATA": "1", "MAX_SOURCE_AGE_DAYS": "21"})
    def test_current_matches_pass(self):
        loader.require_recent_match(int(date.today().strftime("%Y%m%d")))

    @patch.dict(loader.os.environ, {"REQUIRE_RECENT_DATA": "1", "MAX_SOURCE_AGE_DAYS": "21"})
    def test_future_matches_are_rejected(self):
        future = int((date.today() + timedelta(days=1)).strftime("%Y%m%d"))
        with self.assertRaises(ValueError):
            loader.require_recent_match(future)
