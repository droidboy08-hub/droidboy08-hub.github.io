#!/usr/bin/env python3
"""Build the search index the site's own search box reads.

One JSON file, generated from the pages themselves so it can never describe a
section that no longer exists. Run by deploy.sh before every upload.

Each entry is one heading and the text under it, which is the unit people
actually look for — "what does it say about downloads" rather than "which file
is that in".
"""
import json, pathlib, re, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = {
    "index.html":           ("/",           "Home"),
    "privacy/index.html":   ("/privacy/",   "Privacy policy"),
    "support/index.html":   ("/support/",   "Support"),
    "changelog/index.html": ("/changelog/", "Changelog"),
    "terms/index.html":     ("/terms/",     "Terms of Use"),
}

def clean(fragment: str) -> str:
    fragment = re.sub(r"<(script|style|svg)[^>]*>.*?</\1>", " ", fragment, flags=re.S | re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()

entries = []
for path, (url, page) in PAGES.items():
    source = (ROOT / path).read_text()
    body = source[source.index("<main"):source.index("</main>")] if "<main" in source else source

    # Split on every heading, keeping the heading with the text that follows it.
    parts = re.split(r"(<h[1-3][^>]*>.*?</h[1-3]>|<summary[^>]*>.*?</summary>)", body, flags=re.S)
    current_anchor = ""
    # Anchors come from the nearest id above the heading.
    for i, chunk in enumerate(parts):
        heading = re.match(r"<(h[1-3]|summary)([^>]*)>(.*?)</\1>", chunk or "", flags=re.S)
        if not heading:
            continue
        title = clean(heading.group(3))
        if not title:
            continue
        ids = re.findall(r'id="([^"]+)"', body[: body.index(chunk)])
        anchor = f"#{ids[-1]}" if ids else ""
        text = clean(parts[i + 1]) if i + 1 < len(parts) else ""
        entries.append({
            "t": title,
            "p": page,
            "u": url + anchor,
            "b": text[:320],
        })

# The pages themselves, so a search for "privacy" finds the page and not only
# a heading inside it.
for path, (url, page) in PAGES.items():
    source = (ROOT / path).read_text()
    desc = re.search(r'<meta name="description" content="([^"]*)"', source)
    entries.insert(0, {
        "t": page, "p": "Page", "u": url,
        "b": clean(desc.group(1)) if desc else "",
        "top": 1,
    })

out = ROOT / "assets" / "search-index.json"
out.write_text(json.dumps(entries, separators=(",", ":")))
print(f"search index: {len(entries)} entries, {out.stat().st_size / 1024:.1f} KB")
