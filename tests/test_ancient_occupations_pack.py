"""Data acceptance checks. Historical interpretation still requires editorial review."""
import json
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PACK_PATH = DATA / "packs/ancient-chinese-occupations.json"


class AncientOccupationsPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = json.loads(PACK_PATH.read_text(encoding="utf-8"))
        cls.cards = cls.pack["questions"]

    def test_exactly_90_verified_distinct_concepts(self):
        self.assertEqual(len(self.cards), 90)
        self.assertEqual({q["status"] for q in self.cards}, {"verified"})
        for field in ("id", "conceptId", "term"):
            self.assertEqual(len({q[field] for q in self.cards}), 90, field)

    def test_aliases_cannot_represent_a_second_card(self):
        owner = {}
        for q in self.cards:
            for label in [q["term"], *q["aliases"]]:
                previous = owner.setdefault(label, q["conceptId"])
                self.assertEqual(previous, q["conceptId"], label)

    def test_source_coverage_and_historical_scope(self):
        actual = Counter()
        for q in self.cards:
            self.assertTrue(q["sources"])
            self.assertIn("周礼", q["historicalScope"])
            for source in q["sources"]:
                self.assertTrue(source["evidence"].strip(), q["term"])
                self.assertTrue(source["section"].strip(), q["term"])
                self.assertEqual(source["checkedAt"], "2026-10-22")
                actual[source["title"].split("/", 1)[1].split(" -", 1)[0]] += 1
        self.assertEqual(actual, {"天官冢宰": 30, "地官司徒": 30,
                                  "春官宗伯": 15, "冬官考工記": 15})

    def test_complete_explanations_allow_more_than_short_gloss(self):
        self.assertEqual(self.pack["recommendedReadSeconds"], 10)
        for q in self.cards:
            self.assertGreater(len(q["explanation"]), 40)
            self.assertTrue(q["explanation"].endswith("。"), q["term"])

    def test_registry_matches_actual_data_and_stays_inside_data_directory(self):
        registry = json.loads((DATA / "pack-registry.json").read_text(encoding="utf-8"))
        record, = [p for p in registry["packs"] if p["id"] == self.pack["id"]]
        resolved = (DATA / record["file"]).resolve()
        self.assertTrue(resolved.is_relative_to(DATA.resolve()))
        self.assertEqual(resolved, PACK_PATH.resolve())
        self.assertEqual(record["verifiedCount"], len(self.cards))
        self.assertEqual(record["conceptCount"], len({q["conceptId"] for q in self.cards}))
        self.assertEqual(record["draftCount"], 0)
        self.assertEqual(record["status"], "data-ready")
        self.assertEqual(record["playtestStatus"], "pending")

    def test_capacity_for_all_supported_group_sizes(self):
        concepts = {q["conceptId"] for q in self.cards}
        for n in range(3, 10):
            with self.subTest(players=n):
                self.assertGreaterEqual(len(concepts), n * n)
        # A fresh device has enough for 9 players; ten seen concepts leave only 80.
        seen = set(sorted(concepts)[:10])
        self.assertEqual(len(concepts - seen), 80)
        self.assertLess(len(concepts - seen), 9 * 9)


if __name__ == "__main__":
    unittest.main()
