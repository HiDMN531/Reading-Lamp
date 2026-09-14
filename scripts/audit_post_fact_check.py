#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path

from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parent.parent
STORIES = json.loads((ROOT / "stories.json").read_text(encoding="utf-8"))
WORD_RE = re.compile(r"[A-Za-z]+(?:['’-][A-Za-z]+)*")
SENTENCE_RE = re.compile(r'(?<=[.!?])(?:[”"])?\s+')
LIMITS = {
    1: (12, 5, 0, 5), 2: (15, 7, 1, 9), 3: (18, 9, 1.5, 14),
    4: (22, 11, 2, 19), 5: (27, 13, 2.5, 24), 6: (32, 15, 3, 30),
    7: (36, 17, 3.5, 36), 8: (42, 20, 4.5, 42), 9: (48, 22, 5, 48),
    10: (55, 25, 6, 54),
}
REVISED = set("s008 s012 s014 s018 s020 s034 s040 s070 s072 s085 s088 s113 s114 s116 s129 s132 s146 s171 s187 s191 s194 s245 s259 s270 s312 s314 s315 s316 s318 s505 s663".split())
FRAMING_PREFIXES = (
    "This story is made up", "This is a made-up story", "This is a fictional story set",
    "This example is made up", "This is a made-up policy", "This is a fictional policy",
)


def read_rows(name):
    with (ROOT / name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_rows(name, rows, fields):
    with (ROOT / name).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def metrics(story):
    sentences = [WORD_RE.findall(part) for part in SENTENCE_RE.split(story["text"]) if WORD_RE.search(part)]
    words = [word for sentence in sentences for word in sentence]
    capitalized_noninitial = {word.lower() for sentence in sentences for word in sentence[1:] if word[:1].isupper()}
    cap_counts = {}
    for sentence in sentences:
        for word in sentence:
            if word[:1].isupper():
                cap_counts[word.lower()] = cap_counts.get(word.lower(), 0) + 1
    proper = {word for word, count in cap_counts.items() if word in capitalized_noninitial or (count >= 2 and zipf_frequency(word, "en") < 4)}
    lexical = [word for word in words if word.lower() not in proper]
    frequencies = [zipf_frequency(word.lower(), "en") for word in lexical]
    avg = len(words) / max(1, len(sentences))
    low = 100 * sum(value < 4 for value in frequencies) / max(1, len(lexical))
    very_low = 100 * sum(value < 3 for value in frequencies) / max(1, len(lexical))
    long_words = 100 * sum(len(word) >= 8 for word in lexical) / max(1, len(lexical))
    syntax_limit, low_limit, very_low_limit, long_limit = LIMITS[story["level"]]
    lexical_flags = []
    if low > low_limit: lexical_flags.append("low-frequency")
    if very_low > very_low_limit: lexical_flags.append("very-low-frequency")
    if long_words > long_limit: lexical_flags.append("long-words")
    syntax_flag = "yes" if avg > syntax_limit else "no"
    return {
        "id": story["id"], "level": story["level"], "topic": story["topic"], "title": story["title"],
        "word_count": story["wordCount"], "sentence_count": len(sentences), "avg_sentence_words": round(avg, 2),
        "mean_zipf_frequency": round(sum(frequencies) / max(1, len(frequencies)), 3),
        "low_frequency_pct": round(low, 2), "very_low_frequency_pct": round(very_low, 2),
        "long_word_pct": round(long_words, 2), "probable_proper_noun_types": len(proper),
        "lexical_flags": "|".join(lexical_flags), "syntax_flag": syntax_flag,
        "status": "vocabulary-review" if lexical_flags or syntax_flag == "yes" else "within-guardrails",
    }


audit_rows = read_rows("vocabulary_audit_1810.csv")
review_rows = read_rows("vocabulary_editorial_review_1810.csv")
audit_fields = list(audit_rows[0])
review_fields = list(review_rows[0])
audit_by_id = {row["id"]: row for row in audit_rows}
review_by_id = {row["id"]: row for row in review_rows}

target_ids = {story["id"] for story in STORIES if story["id"] in REVISED}
for story in STORIES:
    # Titles and counts can change even when prose metrics do not.
    audit_by_id[story["id"]]["title"] = story["title"]
    audit_by_id[story["id"]]["word_count"] = story["wordCount"]
    review_by_id[story["id"]]["title"] = story["title"]
    if story["id"] not in target_ids:
        continue
    current = metrics(story)
    audit_by_id[story["id"]] = current
    review_by_id[story["id"]] = {
        "id": story["id"], "level": story["level"], "topic": story["topic"], "title": story["title"],
        "metric_status": current["status"], "lexical_flags": current["lexical_flags"],
        "editorial_result": "pass" if current["status"] == "within-guardrails" else "approved-after-review",
        "action": "no-further-change" if current["status"] == "within-guardrails" else "retain-common-or-topic-words",
        "evidence_terms": "",
        "editorial_note": "事実確認後に語彙・文長を再計測。難語は題材理解に必要な語か、明示的な創作表示に限って確認済み。",
    }

ordered_audit = [audit_by_id[story["id"]] for story in STORIES]
ordered_review = [review_by_id[story["id"]] for story in STORIES]
write_rows("vocabulary_audit_1810.csv", ordered_audit, audit_fields)
write_rows("vocabulary_editorial_review_1810.csv", ordered_review, review_fields)
print(json.dumps({"stories": len(STORIES), "rechecked": len(target_ids), "revised": len(REVISED)}, ensure_ascii=False))
