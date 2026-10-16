#!/usr/bin/env python3
"""
Tüm site dosyalarını tek bir kurulum.php içine gömer.
  python3 tools/build_installer.py   ->  dist/kurulum.php
GitHub Actions her değişiklikte otomatik üretip Releases'a koyar.
"""
import base64
import datetime
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = [
    "index.html", "app.js", "sw.js", "manifest.json", "icon-192.png", "icon-512.png",
    "lib/leaflet.js", "lib/leaflet.css", "lib/leaflet-rotate.js", "lib/pmtiles.js", "lib/protomaps-leaflet.js",
    "data/radars-tr.json",
    "api/index.php", "api/lib.php", "api/admin.php", "api/.htaccess", "api/data/.htaccess", "api/config.example.php",
    "admin/index.html", "admin/admin.js",
]


def php_str(s: str) -> str:
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def main():
    parts = []
    for rel in FILES:
        data = (ROOT / rel).read_bytes()
        parts.append(f"  {php_str(rel)} => '{base64.b64encode(data).decode()}',")
    arr = "[\n" + "\n".join(parts) + "\n]"
    tpl = (ROOT / "tools/installer_template.php").read_text(encoding="utf-8")
    version = datetime.datetime.now(datetime.timezone.utc).strftime("%Y.%m.%d-%H%M")
    out = tpl.replace("/*__FILES__*/[]", arr, 1).replace("__VERSION__", version, 1)
    dest = ROOT / "dist/kurulum.php"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(out, encoding="utf-8")
    print(f"{dest} ({dest.stat().st_size // 1024} KB, {len(FILES)} dosya, sürüm {version})")


if __name__ == "__main__":
    main()
