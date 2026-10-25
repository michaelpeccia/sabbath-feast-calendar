"""Builds js/content.js: the Sabbath and feast pages.

Scripture is copied word for word from the World English Bible (public domain),
using the JSON files in the npm package "world-english-bible".

Run:
  npm pack world-english-bible && tar xzf world-english-bible-*.tgz
  python tools/build_content.py package/json

The "instructs" lines are written to say only what the cited verse says.
Edit them here, then run this script again.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from web_text import passage

PAGES = [
    {
        "key": "sabbath",
        "name": "The Sabbath",
        "passages": [
            ("Genesis 2:2-3", "genesis", 2, 2, 2, 3),
            ("Exodus 20:8-11", "exodus", 20, 8, 20, 11),
            ("Leviticus 23:3", "leviticus", 23, 3, 23, 3),
        ],
        "instructs": [
            ("Remember the Sabbath day, to keep it holy.", "Exodus 20:8"),
            ("Work six days. The seventh day is a Sabbath of solemn rest and a holy convocation.", "Leviticus 23:3"),
            ("Do no kind of work, and neither should your children, your servants, your livestock, or the stranger within your gates.", "Exodus 20:10"),
            ("It is a Sabbath to Yahweh in all your dwellings.", "Leviticus 23:3"),
            ("Yahweh blessed the seventh day and made it holy, because He rested on it.", "Genesis 2:3; Exodus 20:11"),
        ],
    },
    {
        "key": "passover",
        "name": "Passover",
        "passages": [
            ("Leviticus 23:4-5", "leviticus", 23, 4, 23, 5),
            ("Exodus 12:6", "exodus", 12, 6, 12, 6),
            ("Exodus 12:14", "exodus", 12, 14, 12, 14),
        ],
        "instructs": [
            ("Passover is in the first month, on the fourteenth day, in the evening.", "Leviticus 23:5"),
            ("The lamb was kept until the fourteenth day and killed at evening.", "Exodus 12:6"),
            ("Keep it as a memorial and a feast to Yahweh throughout your generations.", "Exodus 12:14"),
        ],
    },
    {
        "key": "unleavened",
        "name": "Unleavened Bread",
        "passages": [
            ("Leviticus 23:6-8", "leviticus", 23, 6, 23, 8),
            ("Exodus 12:15-20", "exodus", 12, 15, 12, 20),
        ],
        "instructs": [
            ("Starting on the fifteenth day of the first month, eat unleavened bread for seven days.", "Leviticus 23:6"),
            ("Put away yeast out of your houses on the first day. No yeast is to be found in your houses for seven days.", "Exodus 12:15, 19"),
            ("Eat unleavened bread from the evening of the fourteenth until the evening of the twenty-first.", "Exodus 12:18"),
            ("The first day and the seventh day are holy convocations. Do no regular work on them.", "Leviticus 23:7-8"),
        ],
    },
    {
        "key": "firstfruits",
        "name": "Firstfruits",
        "passages": [
            ("Leviticus 23:9-14", "leviticus", 23, 9, 23, 14),
        ],
        "instructs": [
            ("Bring the sheaf of the first fruits of the harvest to the priest.", "Leviticus 23:10"),
            ("The priest waves the sheaf before Yahweh on the next day after the Sabbath.", "Leviticus 23:11"),
            ("On that day, offer a male lamb a year old as a burnt offering, with its meal and drink offerings.", "Leviticus 23:12-13"),
            ("Eat no bread, roasted grain, or fresh grain until that same day, when the offering has been brought.", "Leviticus 23:14"),
        ],
    },
    {
        "key": "shavuot",
        "name": "Shavuot (Weeks)",
        "passages": [
            ("Leviticus 23:15-22", "leviticus", 23, 15, 23, 22),
        ],
        "instructs": [
            ("Count from the day after the Sabbath when the sheaf was waved: seven Sabbaths complete.", "Leviticus 23:15"),
            ("Count fifty days to the next day after the seventh Sabbath, and offer a new meal offering.", "Leviticus 23:16"),
            ("Bring two loaves baked with yeast as first fruits to Yahweh.", "Leviticus 23:17"),
            ("Proclaim a holy convocation that same day. Do no regular work.", "Leviticus 23:21"),
            ("Leave the corners of your field and the gleanings for the poor and the foreigner.", "Leviticus 23:22"),
        ],
    },
    {
        "key": "trumpets",
        "name": "Yom Teruah (Trumpets)",
        "passages": [
            ("Leviticus 23:23-25", "leviticus", 23, 23, 23, 25),
            ("Numbers 29:1", "numbers", 29, 1, 29, 1),
        ],
        "instructs": [
            ("The first day of the seventh month is a solemn rest, a memorial of blowing of trumpets, and a holy convocation.", "Leviticus 23:24"),
            ("Do no regular work, and offer an offering made by fire to Yahweh.", "Leviticus 23:25"),
            ("It is a day of blowing of trumpets.", "Numbers 29:1"),
        ],
    },
    {
        "key": "atonement",
        "name": "Yom Kippur (Atonement)",
        "passages": [
            ("Leviticus 23:26-32", "leviticus", 23, 26, 23, 32),
            ("Leviticus 16:29-31", "leviticus", 16, 29, 16, 31),
        ],
        "instructs": [
            ("The tenth day of the seventh month is the day of atonement and a holy convocation.", "Leviticus 23:27"),
            ("Afflict yourselves (deny yourselves).", "Leviticus 23:27, 32"),
            ("Do no kind of work on that day.", "Leviticus 23:28, 31"),
            ("It is a Sabbath of solemn rest, kept from the evening of the ninth day, from evening to evening.", "Leviticus 23:32"),
        ],
    },
    {
        "key": "tabernacles",
        "name": "Sukkot (Tabernacles)",
        "passages": [
            ("Leviticus 23:33-36", "leviticus", 23, 33, 23, 36),
            ("Leviticus 23:39-43", "leviticus", 23, 39, 23, 43),
            ("Deuteronomy 16:13-15", "deuteronomy", 16, 13, 16, 15),
        ],
        "instructs": [
            ("Starting on the fifteenth day of the seventh month, keep the feast of booths for seven days.", "Leviticus 23:34"),
            ("The first day is a holy convocation and a solemn rest. Do no regular work.", "Leviticus 23:35, 39"),
            ("On the first day, take the fruit of majestic trees, palm branches, boughs of thick trees, and willows of the brook, and rejoice before Yahweh seven days.", "Leviticus 23:40"),
            ("Dwell in temporary shelters seven days, so your generations may know Yahweh brought Israel out of Egypt.", "Leviticus 23:42-43"),
            ("Rejoice together with your household, servants, the Levite, the foreigner, the fatherless, and the widow.", "Deuteronomy 16:14"),
        ],
    },
    {
        "key": "eighthday",
        "name": "The Eighth Day",
        "passages": [
            ("Leviticus 23:36", "leviticus", 23, 36, 23, 36),
            ("Leviticus 23:39", "leviticus", 23, 39, 23, 39),
            ("Numbers 29:35", "numbers", 29, 35, 29, 35),
        ],
        "instructs": [
            ("The eighth day is a holy convocation and a solemn assembly.", "Leviticus 23:36"),
            ("Offer an offering made by fire to Yahweh. Do no regular work.", "Leviticus 23:36"),
            ("The eighth day is a solemn rest.", "Leviticus 23:39"),
        ],
    },
]

OPEN_Q = "“‘ "
CLOSE_Q = "”’ "


def clean_ends(verses):
    """Trim speech marks left hanging at the very start and end of a passage."""
    if verses:
        verses[0]["t"] = verses[0]["t"].lstrip(OPEN_Q)
        last = verses[-1]["t"]
        trimmed = last.rstrip(CLOSE_Q)
        # keep a closing mark only when it closes a quote opened inside the passage
        verses[-1]["t"] = trimmed
    return verses


def main(json_dir):
    out = {}
    for page in PAGES:
        passages = []
        for ref, book, c1, v1, c2, v2 in page["passages"]:
            verses = clean_ends(passage(json_dir, book, c1, v1, c2, v2))
            if not verses:
                raise SystemExit("No text found for " + ref)
            passages.append({"ref": ref, "verses": [{"v": x["v"], "t": x["t"]} for x in verses]})
        out[page["key"]] = {
            "name": page["name"],
            "passages": passages,
            "instructs": [{"text": t, "ref": r} for t, r in page["instructs"]],
        }
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target = os.path.join(root, "js", "content.js")
    with open(target, "w", encoding="utf-8") as f:
        f.write("// Built by tools/build_content.py. Scripture: World English Bible (public domain).\n")
        f.write("// Edit the instructions in tools/build_content.py, then rebuild.\n")
        f.write("window.CONTENT = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
    print("Wrote", target)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
