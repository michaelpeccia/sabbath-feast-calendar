"""Pull exact World English Bible text from the world-english-bible package's JSON files.

Usage (from Python): passage(json_dir, "leviticus", 23, 4, 23, 8)
"""
import json, re, os

def _load(json_dir, book):
    with open(os.path.join(json_dir, book + ".json"), encoding="utf-8") as f:
        return json.load(f)

def passage(json_dir, book, c1, v1, c2=None, v2=None):
    c2 = c2 or c1
    v2 = v2 or v1
    out = []
    for item in _load(json_dir, book):
        if "verseNumber" not in item or "value" not in item:
            continue
        c, v = item["chapterNumber"], item["verseNumber"]
        if (c, v) < (c1, v1) or (c, v) > (c2, v2):
            continue
        if out and out[-1][0] == (c, v):
            out[-1][1].append(item["value"])
        else:
            out.append(((c, v), [item["value"]]))
    return [{"c": cv[0], "v": cv[1], "t": re.sub(r"\s+", " ", " ".join(parts)).strip()} for cv, parts in out]
