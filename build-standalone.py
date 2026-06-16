#!/usr/bin/env python3
"""Build a single self-contained NOVA SURVIVOR HTML file.

Inlines style.css and all game scripts into index.html, and embeds the boot
splash logo + favicon as data URIs, so the whole game is one portable file
that runs offline by just opening it in a browser (no server, no asset files).

Usage:  python3 build-standalone.py   ->   nova-survivor.html
"""
import base64
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "nova-survivor.html"


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def data_uri(name, mime="image/png"):
    b64 = base64.b64encode((ROOT / name).read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def replace_once(html, needle, repl):
    if needle not in html:
        sys.exit(f"ERROR: expected to find in index.html but didn't:\n  {needle}")
    return html.replace(needle, repl, 1)


def main():
    html = read("index.html")

    # Embed images as data URIs (boot splash logo + favicon).
    favicon = data_uri("assets/favicon-64.png")
    logo = data_uri("assets/icon-512.png")

    # Drop PWA-only links that point at files we don't ship in a single file.
    html = replace_once(html, '  <link rel="manifest" href="manifest.json" />\n', "")
    html = replace_once(html, '  <link rel="apple-touch-icon" href="assets/icon-192.png" />\n', "")

    # Inline favicon, splash logo, stylesheet.
    html = replace_once(
        html,
        '<link rel="icon" type="image/png" href="assets/favicon-64.png" />',
        f'<link rel="icon" type="image/png" href="{favicon}" />',
    )
    html = replace_once(
        html,
        'src="assets/icon-512.png"',
        f'src="{logo}"',
    )
    html = replace_once(
        html,
        '<link rel="stylesheet" href="style.css" />',
        "<style>\n" + read("style.css") + "\n</style>",
    )

    # Inline scripts, in load order. None contain "</script>" (verified).
    for js in ("icons.js", "sprites.js", "space.js", "game.js"):
        content = read(js)
        if "</script" in content.lower():
            sys.exit(f"ERROR: {js} contains </script> and can't be naively inlined")
        html = replace_once(html, f'<script src="{js}"></script>', "<script>\n" + content + "\n</script>")

    OUT.write_text(html, encoding="utf-8")
    kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT.name}  ({kb:.0f} KB)  - open it in any browser, fully offline.")


if __name__ == "__main__":
    main()
