"""Resolve a portrait for each top-100 player via Wikidata, then pull the file
from Wikimedia Commons.

Names alone are not enough to identify a person, so every candidate entity has
to clear three checks before its photo is accepted:

  * instance of human (P31 = Q5)
  * tennis player by occupation (P106 = Q10833314) or sport (P641 = Q847)
  * date of birth (P569) equal to the DOB we already hold in our own database

The DOB check is the one that actually pins the identity -- it is what stops a
namesake, a coach, or a different athlete entirely from slipping through. A
player whose DOB we do not hold is only accepted on an exact label match, and
is reported so it can be looked at by hand.

Output: etl/out/player_photos.json  (one entry per resolved player)

Usage:
    python etl/fetch_player_photos.py resolve
    python etl/fetch_player_photos.py download
"""

from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "etl" / "out"
OUT.mkdir(parents=True, exist_ok=True)
RESOLVED = OUT / "player_photos.json"

WIKIDATA = "https://www.wikidata.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"

# Wikimedia asks for a descriptive UA; anonymous scripted traffic gets 429s.
UA = "GameSetMatch/1.0 (portfolio project; https://github.com/jihwantime/gamesetmatch)"

Q_HUMAN = "Q5"
Q_TENNIS_PLAYER = "Q10833314"
Q_TENNIS = "Q847"

session = requests.Session()
session.headers["User-Agent"] = UA


def api(url: str, params: dict, tries: int = 5) -> dict:
    """GET with backoff. Wikimedia rate-limits scripted traffic aggressively."""
    params = {**params, "format": "json"}
    delay = 1.0
    for attempt in range(tries):
        r = session.get(url, params=params, timeout=30)
        if r.status_code == 200:
            return r.json()
        if r.status_code in (429, 503) and attempt < tries - 1:
            time.sleep(delay)
            delay *= 2
            continue
        r.raise_for_status()
    raise RuntimeError(f"gave up on {url}")


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))


def norm(s: str) -> str:
    """Fold to bare lowercase letters so 'Félix Auger-Aliassime' == 'Felix Auger Aliassime'."""
    return " ".join(re.sub(r"[^a-z ]", " ", strip_accents(s).lower()).split())


def claim_ids(entity: dict, prop: str) -> list[str]:
    out = []
    for c in entity.get("claims", {}).get(prop, []):
        v = c.get("mainsnak", {}).get("datavalue", {}).get("value")
        if isinstance(v, dict) and "id" in v:
            out.append(v["id"])
    return out


def claim_time(entity: dict, prop: str) -> str | None:
    for c in entity.get("claims", {}).get(prop, []):
        v = c.get("mainsnak", {}).get("datavalue", {}).get("value")
        if isinstance(v, dict) and "time" in v:
            return v["time"]
    return None


def claim_string(entity: dict, prop: str) -> str | None:
    for c in entity.get("claims", {}).get(prop, []):
        v = c.get("mainsnak", {}).get("datavalue", {}).get("value")
        if isinstance(v, str):
            return v
    return None


def search_entities(name: str) -> list[str]:
    """Candidate QIDs for a name, trying a couple of spellings."""
    seen, ids = set(), []
    variants = [name]
    if " " in name:  # our DB drops hyphens; Wikidata keeps them
        parts = name.split()
        variants.append(" ".join(parts[:-2] + ["-".join(parts[-2:])]) if len(parts) > 2
                        else "-".join(parts))
    for v in variants:
        d = api(WIKIDATA, {"action": "wbsearchentities", "search": v,
                           "language": "en", "uselang": "en", "type": "item", "limit": 10})
        for hit in d.get("search", []):
            if hit["id"] not in seen:
                seen.add(hit["id"])
                ids.append(hit["id"])
        time.sleep(0.15)
    return ids


def get_entities(qids: list[str]) -> dict:
    """wbgetentities in batches of 50 (API max)."""
    out = {}
    for i in range(0, len(qids), 50):
        chunk = qids[i:i + 50]
        d = api(WIKIDATA, {"action": "wbgetentities", "ids": "|".join(chunk),
                           "props": "claims|labels|aliases"})
        out.update(d.get("entities", {}))
        time.sleep(0.15)
    return out


def resolve(players: list[dict]) -> list[dict]:
    results = []
    for n, p in enumerate(players, 1):
        name, dob = p["full_name"], p["dob"]
        try:
            qids = search_entities(name)
        except Exception as e:  # noqa: BLE001 - report and carry on
            print(f"  !! {name}: search failed ({e})")
            results.append({**p, "status": "search-failed"})
            continue

        ents = get_entities(qids) if qids else {}
        best = None
        for qid in qids:
            e = ents.get(qid)
            if not e or "claims" not in e:
                continue
            if Q_HUMAN not in claim_ids(e, "P31"):
                continue
            is_tennis = (Q_TENNIS_PLAYER in claim_ids(e, "P106")
                         or Q_TENNIS in claim_ids(e, "P641"))
            if not is_tennis:
                continue

            label = e.get("labels", {}).get("en", {}).get("value", "")
            aliases = [a["value"] for a in e.get("aliases", {}).get("en", [])]
            name_match = norm(label) == norm(name) or any(norm(a) == norm(name) for a in aliases)

            t = claim_time(e, "P569")
            wd_dob = None
            if t:
                m = re.match(r"\+(\d{4})-(\d{2})-(\d{2})", t)
                if m:
                    wd_dob = int(m.group(1) + m.group(2) + m.group(3))

            if dob and wd_dob:
                if wd_dob != dob:
                    continue          # different person with the same name
                verified = "dob"
            elif name_match:
                verified = "name-only"  # no DOB on our side; flag for review
            else:
                continue

            image = claim_string(e, "P18")
            best = {**p, "qid": qid, "wd_label": label, "wd_dob": wd_dob,
                    "verified": verified, "image": image,
                    "status": "ok" if image else "no-image"}
            if image:
                break                  # keep looking if this entity has no photo

        if best is None:
            best = {**p, "status": "unresolved"}
        results.append(best)
        flag = {"ok": "  ", "no-image": "??", "unresolved": "!!"}.get(best["status"], "!!")
        print(f"{flag} {n:3d}. {name:28s} {best.get('qid','-'):9s} "
              f"{best.get('verified','-'):9s} {best.get('image') or best['status']}")
    return results


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "resolve"
    if cmd != "resolve":
        raise SystemExit("only 'resolve' is implemented here; see download step")

    tsv = Path(sys.argv[2])
    players = []
    for line in tsv.read_text().splitlines():
        if not line.strip():
            continue
        rank, pid, full_name, ioc, dob = (line.split("\t") + [""] * 5)[:5]
        players.append({"rank": int(rank), "id": int(pid), "full_name": full_name,
                        "ioc": ioc or None, "dob": int(dob) if dob.strip() else None})

    results = resolve(players)
    RESOLVED.write_text(json.dumps(results, indent=2, ensure_ascii=False))

    ok = [r for r in results if r["status"] == "ok"]
    print(f"\nresolved {len(ok)}/{len(results)} with a photo")
    for r in results:
        if r["status"] != "ok":
            print(f"  needs attention: {r['full_name']} -> {r['status']}")
    weak = [r for r in ok if r.get("verified") == "name-only"]
    if weak:
        print(f"\n{len(weak)} matched on name only (no DOB in our DB) - verify by eye:")
        for r in weak:
            print(f"  {r['full_name']} -> {r['qid']} {r['wd_label']}")


if __name__ == "__main__":
    main()
