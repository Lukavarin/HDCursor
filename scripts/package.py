#!/usr/bin/env python3
"""
HDCursor - Extension Packager for Mozilla Add-on Signing
Creates a clean, production-ready ZIP archive with POSIX paths.
"""

import os
import zipfile

FILES_TO_PACK = [
    'manifest.json',
    'background/background.js',
    'content/content.js',
    'content/shield.css',
    'icons/icon.svg',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'icons/icon-128.png',
    'options/options.html',
    'options/options.css',
    'options/options.js',
    'popup/popup.html',
    'popup/popup.css',
    'popup/popup.js',
    'shared/defaults.js',
    'shared/storage.js'
]

OUTPUT_ZIP = 'hdcursor-v1.0.0.zip'

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root_dir)

    print(f"Creating {OUTPUT_ZIP} from {root_dir}...")
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zf:
        for rel_path in FILES_TO_PACK:
            arcname = rel_path.replace('\\', '/')
            zf.write(rel_path, arcname=arcname)
            print(f"  + {arcname}")

    print(f"\nDone! Package created: {OUTPUT_ZIP} ({os.path.getsize(OUTPUT_ZIP):,} bytes)")

if __name__ == '__main__':
    main()
