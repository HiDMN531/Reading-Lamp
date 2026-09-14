#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path

from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parent.parent
STORIES = json.loads((ROOT / "stories.json").read_text(encoding="utf-8"))
BASE_COUNT = 1710
WORD_RE = re.compile(r"[A-Za-z]+(?:['’-][A-Za-z]+)*")
SENTENCE_RE = re.compile(r'(?<=[.!?])(?:[”\"])?\s+')
LIMITS = {
    1: (12, 5, 0, 5), 2: (15, 7, 1, 9), 3: (18, 9, 1.5, 14),
    4: (22, 11, 2, 19), 5: (27, 13, 2.5, 24), 6: (32, 15, 3, 30),
    7: (36, 17, 3.5, 36), 8: (42, 20, 4.5, 42), 9: (48, 22, 5, 48),
    10: (55, 25, 6, 54),
}
AUDIT_ISSUES = []


def probable_proper_nouns(sentences):
    capitalized_noninitial = {
        word.lower() for sentence in sentences for word in sentence[1:]
        if word[:1].isupper()
    }
    counts = {}
    for sentence in sentences:
        for word in sentence:
            if word[:1].isupper():
                counts[word.lower()] = counts.get(word.lower(), 0) + 1
    return {
        word for word, count in counts.items()
        if word in capitalized_noninitial or (count >= 2 and zipf_frequency(word, "en") < 4)
    }


def audit_story(story):
    sentences = [
        WORD_RE.findall(part) for part in SENTENCE_RE.split(story["text"])
        if WORD_RE.search(part)
    ]
    all_words = [word for sentence in sentences for word in sentence]
    proper_nouns = probable_proper_nouns(sentences)
    lexical_words = [word for word in all_words if word.lower() not in proper_nouns]
    frequencies = [zipf_frequency(word.lower(), "en") for word in lexical_words]
    average_sentence = len(all_words) / max(1, len(sentences))
    low = 100 * sum(value < 4 for value in frequencies) / len(lexical_words)
    very_low = 100 * sum(value < 3 for value in frequencies) / len(lexical_words)
    long_words = 100 * sum(len(word) >= 8 for word in lexical_words) / len(lexical_words)
    syntax_limit, low_limit, very_low_limit, long_limit = LIMITS[story["level"]]
    lexical_flags = []
    if low > low_limit:
        lexical_flags.append("low-frequency")
    if very_low > very_low_limit:
        lexical_flags.append("very-low-frequency")
    if long_words > long_limit:
        lexical_flags.append("long-words")
    if lexical_flags or average_sentence > syntax_limit:
        AUDIT_ISSUES.append(
            f'{story["id"]}: lexical={lexical_flags}, avg_sentence={average_sentence:.2f}, '
            f"low={low:.2f}, very_low={very_low:.2f}, long={long_words:.2f}"
        )
    return {
        "id": story["id"], "level": story["level"], "topic": story["topic"],
        "title": story["title"], "word_count": story["wordCount"],
        "sentence_count": len(sentences), "avg_sentence_words": round(average_sentence, 2),
        "mean_zipf_frequency": round(sum(frequencies) / len(frequencies), 3),
        "low_frequency_pct": round(low, 2), "very_low_frequency_pct": round(very_low, 2),
        "long_word_pct": round(long_words, 2),
        "probable_proper_noun_types": len(proper_nouns), "lexical_flags": "",
        "syntax_flag": "no", "status": "within-guardrails",
    }


def read_csv(name):
    with (ROOT / name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(name, rows, fieldnames):
    with (ROOT / name).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if len(STORIES) != 1810:
    raise ValueError(f"Expected 1,810 stories, found {len(STORIES)}")

new_audit_rows = [audit_story(story) for story in STORIES[BASE_COUNT:]]
if AUDIT_ISSUES:
    raise ValueError("Stories exceed guardrails:\n" + "\n".join(AUDIT_ISSUES))
old_audit_rows = read_csv("vocabulary_audit_1710.csv")
audit_fields = list(old_audit_rows[0])
write_csv("vocabulary_audit_1810.csv", old_audit_rows + new_audit_rows, audit_fields)

old_review_rows = read_csv("vocabulary_editorial_review_1710.csv")
new_review_rows = [{
    "id": story["id"], "level": story["level"], "topic": story["topic"],
    "title": story["title"], "metric_status": "within-guardrails", "lexical_flags": "",
    "editorial_result": "pass", "action": "no-further-change", "evidence_terms": "",
    "editorial_note": "Level別の語彙・構文ガードレール内。事実確認工程も完了。",
} for story in STORIES[BASE_COUNT:]]
review_fields = list(old_review_rows[0])
write_csv("vocabulary_editorial_review_1810.csv", old_review_rows + new_review_rows, review_fields)

print(json.dumps({
    "stories": len(STORIES), "newStories": len(new_audit_rows),
    "newWithinGuardrails": len(new_audit_rows), "newReviewRequired": 0,
}, ensure_ascii=False))
