#!/usr/bin/env python3
"""
Türkiye'deki radarları ve ortalama hız koridorlarını OpenStreetMap'ten çekip
data/radars-tr.json dosyasına yazar. GitHub Actions her hafta otomatik çalıştırır.

  python3 tools/build_radar_data.py            # Türkiye
  python3 tools/build_radar_data.py --country DE
"""
import argparse
import datetime
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
KEEP_TAGS = {"highway", "enforcement", "maxspeed", "direction", "camera:direction", "name"}


def query(country):
    return f"""
[out:json][timeout:600];
area["ISO3166-1"="{country}"][admin_level=2]->.a;
(node["highway"="speed_camera"](area.a);node["enforcement"="maxspeed"](area.a););
out body;
relation["enforcement"="average_speed"](area.a);
out body;
node(r);
out body;
"""


def fetch(q):
    data = urllib.parse.urlencode({"data": q}).encode()
    last = None
    for attempt in range(3):
        for url in SERVERS:
            try:
                req = urllib.request.Request(url, data=data, headers={"User-Agent": "yol-uyari-data/1.0"})
                with urllib.request.urlopen(req, timeout=660) as r:
                    return json.load(r)["elements"]
            except Exception as e:  # noqa: BLE001
                last = e
                print(f"{url}: {e}", file=sys.stderr)
        time.sleep(30)
    raise SystemExit(f"Overpass'a ulaşılamadı: {last}")


def slim(el):
    out = {"type": el["type"], "id": el["id"]}
    if el["type"] == "node":
        out["lat"] = round(el["lat"], 6)
        out["lon"] = round(el["lon"], 6)
    tags = {k: v for k, v in (el.get("tags") or {}).items() if k in KEEP_TAGS}
    if tags:
        out["tags"] = tags
    if el["type"] == "relation":
        out["members"] = [
            {"type": m["type"], "ref": m["ref"], "role": m.get("role", "")}
            for m in el.get("members", []) if m["type"] == "node"
        ]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--country", default="TR")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    els = fetch(query(a.country))
    seen, items = set(), []
    for el in els:
        key = (el["type"], el["id"])
        if key in seen:
            continue
        seen.add(key)
        items.append(slim(el))
    items.sort(key=lambda e: (e["type"], e["id"]))
    cams = sum(1 for e in items if e["type"] == "node" and "tags" in e)
    rels = sum(1 for e in items if e["type"] == "relation")
    if cams == 0:
        raise SystemExit("Hiç radar gelmedi; eski dosya korunuyor.")
    out = pathlib.Path(a.out or f"data/radars-{a.country.lower()}.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "country": a.country,
        "source": "© OpenStreetMap katkıcıları (ODbL)",
        "elements": items,
    }
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{out}: {cams} radar, {rels} ortalama hız koridoru")


if __name__ == "__main__":
    main()
