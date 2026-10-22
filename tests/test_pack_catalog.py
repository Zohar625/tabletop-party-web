"""Acceptance checks for the shipped dataset, not for a future game runtime."""
import itertools
import json
import unittest
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
EXPECTED = {
    "curious-wildlife", "ancient-artifacts-life", "world-customs",
    "natural-science-phenomena", "ancient-chinese-occupations",
}


class PackCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = json.loads((DATA / "pack-registry.json").read_text(encoding="utf-8"))
        cls.packs = {
            path.stem: json.loads(path.read_text(encoding="utf-8"))
            for path in (DATA / "packs").glob("*.json")
        }

    def test_five_registered_packs_and_all_files_accounted_for(self):
        records = self.registry["packs"]
        self.assertEqual({r["id"] for r in records}, EXPECTED)
        self.assertEqual(len(records), len(EXPECTED))
        self.assertEqual(set(self.packs), EXPECTED)
        for record in records:
            path = (DATA / record["file"]).resolve()
            self.assertTrue(path.is_relative_to(DATA.resolve()))
            self.assertEqual(json.loads(path.read_text(encoding="utf-8")), self.packs[record["id"]])
            self.assertTrue((DATA / record["reviewFile"]).is_file())

    def test_counts_match_shipped_data(self):
        total = 0
        for record in self.registry["packs"]:
            cards = self.packs[record["id"]]["questions"]
            verified = [q for q in cards if q["status"] == "verified"]
            self.assertEqual(len(cards), 90)
            self.assertEqual(record["verifiedCount"], len(verified))
            self.assertEqual(record["conceptCount"], len({q["conceptId"] for q in verified}))
            self.assertEqual(record["draftCount"], len(cards) - len(verified))
            self.assertEqual(len(verified), 90)
            self.assertEqual(record["playtestStatus"], "pending")
            total += len(cards)
        self.assertEqual(total, 450)

    def test_global_ids_concepts_and_aliases_do_not_conflict(self):
        ids, concepts, labels = {}, {}, {}
        for pack in self.packs.values():
            for q in pack["questions"]:
                self.assertNotIn(q["id"], ids, q["id"])
                self.assertNotIn(q["conceptId"], concepts, q["conceptId"])
                ids[q["id"]] = q
                concepts[q["conceptId"]] = q
                for name in [q["term"], *q["aliases"]]:
                    normal = unicodedata.normalize("NFKC", name).strip().casefold()
                    owner = labels.setdefault(normal, q["conceptId"])
                    self.assertEqual(owner, q["conceptId"], name)

    def test_source_and_membership_fields_are_complete(self):
        for pack_id, pack in self.packs.items():
            self.assertEqual(pack_id, pack["id"])
            for q in pack["questions"]:
                with self.subTest(term=q["term"]):
                    self.assertIn(pack_id, q["packIds"])
                    self.assertTrue(set(q["packIds"]).issubset(EXPECTED))
                    self.assertTrue(q["explanation"].strip())
                    self.assertIn(q["difficulty"], (1, 2, 3))
                    self.assertTrue(q["sources"])
                    for source in q["sources"]:
                        parsed = urlparse(source["url"])
                        self.assertIn(parsed.scheme, ("http", "https"))
                        self.assertTrue(parsed.netloc)
                        self.assertTrue(source["title"].strip())
                        self.assertEqual(source["checkedAt"], "2026-10-22")
                        self.assertTrue(source.get("section", "").strip())

    def test_every_pack_combination_has_unique_display_names_and_sufficient_fresh_capacity(self):
        # Inspect actual shipped entries in every one of the 31 nonempty combinations.
        for count in range(1, len(self.packs) + 1):
            for selection in itertools.combinations(sorted(self.packs), count):
                with self.subTest(packs=selection):
                    cards = [q for key in selection for q in self.packs[key]["questions"]]
                    unique = {q["conceptId"] for q in cards}
                    self.assertEqual(len(unique), count * 90)
                    self.assertEqual(len({q["term"] for q in cards}), len(cards))
                    self.assertGreaterEqual(len(unique), 9 * 9)


if __name__ == "__main__":
    unittest.main()
