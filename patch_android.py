#!/usr/bin/env python3
"""
`flutter create` sonrası Android projesine izinleri, adı, simgeyi ve imzayı ekler.
GitHub Actions bunu otomatik çalıştırır. Birden çok kez çalıştırmak güvenlidir.
"""
import pathlib
import re
import sys

APP = pathlib.Path(__file__).resolve().parent.parent
ROOT = APP.parent

PERMS = [
    "android.permission.INTERNET",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_LOCATION",
    "android.permission.WAKE_LOCK",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.MODIFY_AUDIO_SETTINGS",
]

TTS_QUERY = """    <queries>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>
"""


def manifest():
    f = APP / "android/app/src/main/AndroidManifest.xml"
    xml = f.read_text(encoding="utf-8")
    m = re.search(r"<manifest[^>]*>\n?", xml)
    add = "".join(f'    <uses-permission android:name="{p}" />\n' for p in PERMS if f'"{p}"' not in xml)
    if add:
        xml = xml[: m.end()] + add + xml[m.end():]
    if "TTS_SERVICE" not in xml:
        if "<queries>" in xml:
            xml = xml.replace("<queries>", TTS_QUERY.strip().replace("</queries>", "").rstrip() + "\n", 1)
        else:
            xml = xml.replace("</manifest>", TTS_QUERY + "</manifest>")
    xml = re.sub(r'android:label="[^"]*"', 'android:label="Yol Uyarı"', xml, count=1)
    f.write_text(xml, encoding="utf-8")
    print("AndroidManifest.xml güncellendi")


SIGN_KTS = """    signingConfigs {
        create("yoluyari") {
            storeFile = file("../../keystore/yoluyari.jks")
            storePassword = "yoluyari"
            keyAlias = "yoluyari"
            keyPassword = "yoluyari"
        }
    }

"""
SIGN_GROOVY = """    signingConfigs {
        yoluyari {
            storeFile file('../../keystore/yoluyari.jks')
            storePassword 'yoluyari'
            keyAlias 'yoluyari'
            keyPassword 'yoluyari'
        }
    }

"""


def gradle():
    kts = APP / "android/app/build.gradle.kts"
    groovy = APP / "android/app/build.gradle"
    if kts.exists():
        s = kts.read_text(encoding="utf-8")
        s = re.sub(r"minSdk\s*=\s*flutter\.minSdkVersion", "minSdk = 23", s)
        if 'create("yoluyari")' not in s:
            s = s.replace("    buildTypes {", SIGN_KTS + "    buildTypes {", 1)
        s = s.replace('signingConfigs.getByName("debug")', 'signingConfigs.getByName("yoluyari")')
        # Bildirim eklentisi Java 8+ kütüphanelerinin desugar edilmesini ister
        if "isCoreLibraryDesugaringEnabled" not in s:
            if "compileOptions {" in s:
                s = s.replace("compileOptions {", "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", 1)
            else:
                s = s.replace("    buildTypes {", "    compileOptions {\n        isCoreLibraryDesugaringEnabled = true\n    }\n\n    buildTypes {", 1)
        if "desugar_jdk_libs" not in s:
            s += '\ndependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")\n}\n'
        kts.write_text(s, encoding="utf-8")
        print("build.gradle.kts: minSdk 23 + sabit imza")
    elif groovy.exists():
        s = groovy.read_text(encoding="utf-8")
        s = re.sub(r"minSdkVersion\s+flutter\.minSdkVersion", "minSdkVersion 23", s)
        s = re.sub(r"minSdk\s*=\s*flutter\.minSdkVersion", "minSdk = 23", s)
        if "yoluyari {" not in s:
            s = s.replace("    buildTypes {", SIGN_GROOVY + "    buildTypes {", 1)
        s = s.replace("signingConfig signingConfigs.debug", "signingConfig signingConfigs.yoluyari")
        s = s.replace('signingConfig = signingConfigs.debug', 'signingConfig = signingConfigs.yoluyari')
        if "coreLibraryDesugaringEnabled" not in s:
            if "compileOptions {" in s:
                s = s.replace("compileOptions {", "compileOptions {\n        coreLibraryDesugaringEnabled true", 1)
            else:
                s = s.replace("    buildTypes {", "    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }\n\n    buildTypes {", 1)
        if "desugar_jdk_libs" not in s:
            s += "\ndependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'\n}\n"
        groovy.write_text(s, encoding="utf-8")
        print("build.gradle: minSdk 23 + sabit imza")
    else:
        sys.exit("build.gradle bulunamadı")


def icons():
    try:
        from PIL import Image
    except ImportError:
        print("Pillow yok, simge atlandı")
        return
    src = ROOT / "icon-512.png"
    if not src.exists():
        print("icon-512.png yok, simge atlandı")
        return
    im = Image.open(src).convert("RGBA")
    sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for d, px in sizes.items():
        out = APP / f"android/app/src/main/res/mipmap-{d}/ic_launcher.png"
        if out.parent.exists():
            im.resize((px, px), Image.LANCZOS).save(out)
    print("Uygulama simgesi eklendi")


if __name__ == "__main__":
    manifest()
    gradle()
    icons()
