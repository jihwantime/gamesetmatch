"""Download the resolved Commons files and cut a square portrait from each.

Reads etl/out/player_photos.json (written by fetch_player_photos.py), pulls a
server-rendered thumbnail for every accepted file, and hands it to the Vision
face cropper so the avatar is framed on the player's face rather than centre-
cropped onto a torso. Writes:

    web-next/public/players/<player_id>.jpg
    web-next/lib/playerPhotos.ts

Attribution travels with the image: these are CC-licensed files, so artist and
licence are carried through into the generated module and rendered on the page.
"""

from __future__ import annotations

import html
import json
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_player_photos import api, COMMONS, session  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web-next"
PUBLIC = WEB / "public" / "players"
TMP = ROOT / "etl" / "out" / "photo_src"
RESOLVED = ROOT / "etl" / "out" / "player_photos.json"
CROPPER = ROOT / "etl" / "out" / "facecrop"

SIZE = 320          # rendered at 56-72px, so this covers 3x displays
THUMB_WIDTH = 900   # enough resolution to crop a face out of a wide shot

# Players the automatic pass could not settle on its own.
#
# Munar and Cerundolo: our dataset and Wikidata disagree on the day/month of
# birth, so the DOB gate rejected them. Both names are unique among tour
# players and both entities are the right nationality and era, so they are
# accepted here and were checked by eye afterwards.
#
# Buse: Wikidata carries no P18, but his Commons category holds exactly one
# file, which is of him.
MANUAL: dict[int, dict] = {
    144719: {"image": "Munar WM19 (12) (48521794586).jpg", "qid": "Q17274717",
             "note": "DOB differs between our data (1997-05-05) and Wikidata (1997-05-15)"},
    207678: {"image": "Cerundolo JM. RGQ22 (3) (52128606242).jpg", "qid": "Q105636111",
             "note": "DOB differs between our data (2001-11-15) and Wikidata (2001-01-15)"},
    209860: {"image": "Buse W-S 2026.jpg", "qid": "Q116679965",
             "note": "from Commons Category:Ignacio Buse; no P18 on Wikidata"},
}

# Commons has no freely licensed photograph of these players at all.
# They fall back to a monogram in the UI rather than to a wrong face.
NO_PHOTO = {
    210696: "Alexander Blockx",
    210262: "Jaime Faria",
    210017: "Daniel Merida Aguilar",
    211776: "Martin Landaluce",
    212021: "Martin Landaluce",   # duplicate player row in our dataset
}


def clean(s: str | None) -> str | None:
    """extmetadata ships HTML; we want a plain attribution line."""
    if not s:
        return None
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return " ".join(s.split()) or None


def file_info(filename: str) -> dict | None:
    d = api(COMMONS, {
        "action": "query", "titles": f"File:{filename}", "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": str(THUMB_WIDTH),
    })
    for page in d.get("query", {}).get("pages", {}).values():
        ii = page.get("imageinfo")
        if not ii:
            continue
        info = ii[0]
        meta = info.get("extmetadata", {})
        return {
            "thumb": info.get("thumburl") or info.get("url"),
            "descurl": info.get("descriptionurl"),
            "artist": clean(meta.get("Artist", {}).get("value")),
            "license": clean(meta.get("LicenseShortName", {}).get("value")),
        }
    return None


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)

    # Build the cropper once instead of re-compiling per photo.
    if not CROPPER.exists():
        print("compiling face cropper ...")
        subprocess.run(["swiftc", "-O", str(ROOT / "etl" / "facecrop.swift"),
                        "-o", str(CROPPER)], check=True)

    records = json.loads(RESOLVED.read_text())
    entries, failures = [], []

    for r in records:
        pid, name = r["id"], r["full_name"]
        if pid in NO_PHOTO:
            continue
        override = MANUAL.get(pid)
        image = override["image"] if override else r.get("image")
        if not image:
            failures.append((name, "no image"))
            continue

        info = file_info(image)
        if not info or not info["thumb"]:
            failures.append((name, "no thumbnail"))
            continue

        raw = TMP / f"{pid}.orig"
        if not raw.exists():
            resp = session.get(info["thumb"], timeout=60)
            if resp.status_code != 200:
                failures.append((name, f"download {resp.status_code}"))
                continue
            raw.write_bytes(resp.content)
            time.sleep(0.1)

        dest = PUBLIC / f"{pid}.jpg"
        proc = subprocess.run([str(CROPPER), str(raw), str(dest), str(SIZE)],
                              capture_output=True, text=True)
        if proc.returncode != 0:
            failures.append((name, proc.stderr.strip() or f"crop exit {proc.returncode}"))
            continue

        entries.append({
            "id": pid, "name": name, "file": image,
            "credit": info["artist"], "license": info["license"],
            "source": info["descurl"],
            "qid": override["qid"] if override else r.get("qid"),
        })
        print(f"  {pid:7d} {name:28s} {proc.stdout.strip()}")

    entries.sort(key=lambda e: e["id"])
    ts = WEB / "lib" / "playerPhotos.ts"
    lines = [
        "// GENERATED by etl/download_player_photos.py -- do not edit by hand.",
        "//",
        "// One portrait per top-100 player. Each Wikidata entity was matched to our",
        "// own player row by date of birth before its photo was accepted, and every",
        "// crop is centred on a Vision-detected face. Players with no freely licensed",
        "// photograph on Commons are absent here and fall back to a monogram.",
        "",
        "export type PlayerPhoto = {",
        "  src: string;",
        "  credit: string | null;",
        "  license: string | null;",
        "  source: string | null;",
        "};",
        "",
        "export const PLAYER_PHOTOS: Record<number, PlayerPhoto> = {",
    ]
    for e in entries:
        def js(v):
            return "null" if v is None else json.dumps(v, ensure_ascii=False)
        lines.append(
            f'  {e["id"]}: {{ src: "/players/{e["id"]}.jpg", '
            f'credit: {js(e["credit"])}, license: {js(e["license"])}, '
            f'source: {js(e["source"])} }}, // {e["name"]}'
        )
    lines += [
        "};",
        "",
        "export function playerPhoto(id: number): PlayerPhoto | null {",
        "  return PLAYER_PHOTOS[id] ?? null;",
        "}",
        "",
        "/** Fallback monogram for players with no freely licensed photograph. */",
        "export function initials(fullName: string): string {",
        "  const parts = fullName.trim().split(/\\s+/);",
        "  if (parts.length === 0) return \"?\";",
        "  const first = parts[0][0] ?? \"\";",
        "  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? \"\" : \"\";",
        "  return (first + last).toUpperCase();",
        "}",
        "",
    ]
    ts.write_text("\n".join(lines))

    print(f"\nwrote {len(entries)} portraits -> {PUBLIC}")
    print(f"wrote {ts.relative_to(ROOT)}")
    if failures:
        print(f"\n{len(failures)} failed:")
        for name, why in failures:
            print(f"  {name}: {why}")
    print(f"\nno free photo on Commons ({len(set(NO_PHOTO.values()))} players): "
          f"{', '.join(sorted(set(NO_PHOTO.values())))}")


if __name__ == "__main__":
    main()
