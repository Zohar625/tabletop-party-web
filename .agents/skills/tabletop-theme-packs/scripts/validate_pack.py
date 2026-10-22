"""Validate pack structure and exact concept conflicts; does not fact-check sources."""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def validate(pack):
    errors = []
    if not isinstance(pack, dict):
        return ["pack must be an object"]
    if type(pack.get("schemaVersion")) is not int or pack["schemaVersion"] != 1:
        errors.append("schemaVersion must be 1")
    pack_id = pack.get("id")
    if not isinstance(pack_id, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", pack_id):
        errors.append("invalid pack id")
    for key in ("title", "description", "version"):
        if not nonempty(pack.get(key)):
            errors.append(f"missing {key}")
    questions = pack.get("questions")
    if not isinstance(questions, list) or not questions:
        return errors + ["questions must be a nonempty array"]
    ids, concepts = set(), set()
    for i, q in enumerate(questions):
        prefix = f"questions[{i}]"
        if not isinstance(q, dict):
            errors.append(f"{prefix}: must be object")
            continue
        for key in ("id", "conceptId", "term", "explanation"):
            if not nonempty(q.get(key)):
                errors.append(f"{prefix}: missing {key}")
        for key, seen in (("id", ids), ("conceptId", concepts)):
            value = q.get(key)
            if nonempty(value):
                if value in seen:
                    errors.append(f"{prefix}: duplicate {key} {value}")
                seen.add(value)
        aliases = q.get("aliases")
        if not isinstance(aliases, list) or any(not nonempty(a) for a in aliases):
            errors.append(f"{prefix}: invalid aliases")
        packs = q.get("packIds")
        if not isinstance(packs, list) or pack_id not in packs or any(not nonempty(p) for p in packs):
            errors.append(f"{prefix}: invalid packIds")
        if type(q.get("difficulty")) is not int or q["difficulty"] not in (1, 2, 3):
            errors.append(f"{prefix}: difficulty must be 1/2/3")
        status, sources = q.get("status"), q.get("sources")
        if status not in ("verified", "draft"):
            errors.append(f"{prefix}: invalid status")
        if not isinstance(sources, list):
            errors.append(f"{prefix}: sources must be an array")
            continue
        if status == "verified" and not sources:
            errors.append(f"{prefix}: verified question needs sources")
        for source in sources:
            if not isinstance(source, dict):
                errors.append(f"{prefix}: source must be object")
                continue
            try:
                parsed = urlparse(source.get("url", ""))
                if parsed.scheme not in ("http", "https") or not parsed.netloc:
                    raise ValueError("invalid URL")
                if not nonempty(source.get("title")):
                    raise ValueError("missing title")
                checked = source.get("checkedAt", "")
                if not isinstance(checked, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", checked):
                    raise ValueError("invalid date")
                if date.fromisoformat(checked) > date.today():
                    raise ValueError("future check date")
            except (ValueError, TypeError, AttributeError):
                errors.append(f"{prefix}: invalid source URL/title/check date")
    return errors


def read_pack(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pack", type=Path)
    parser.add_argument("--existing-dir", type=Path)
    args = parser.parse_args()
    try:
        pack = read_pack(args.pack)
        errors = validate(pack)
        if not errors and args.existing_dir:
            if not args.existing_dir.is_dir():
                errors.append("existing directory does not exist")
            else:
                for path in sorted(args.existing_dir.rglob("*.json")):
                    if path.resolve() == args.pack.resolve():
                        continue
                    other = read_pack(path)
                    if not isinstance(other, dict) or "questions" not in other:
                        continue
                    other_errors = validate(other)
                    if other_errors:
                        errors.append(f"invalid existing pack: {path}")
                        continue
                    for q in pack["questions"]:
                        for old in other["questions"]:
                            if q["id"] == old["id"] and q["conceptId"] != old["conceptId"]:
                                errors.append(f"ID maps to different concept: {q['id']}")
                            if q["conceptId"] == old["conceptId"]:
                                if any(q[k] != old[k] for k in ("id", "term", "explanation")):
                                    errors.append(f"concept conflict: {q['conceptId']}")
                                else:
                                    print(f"REUSE {q['conceptId']} from {path.name}")
        if errors:
            print("\n".join(f"ERROR {e}" for e in errors))
            return 1
        verified = sum(q["status"] == "verified" for q in pack["questions"])
        print(f"VALID structure: verified={verified}, draft={len(pack['questions']) - verified}")
        print(f"Single-pack capacity: {verified} verified concepts; 9 players need 81 unused.")
        print("Source truth and semantic deduplication require editorial review.")
        return 0
    except (OSError, ValueError, TypeError) as exc:
        print(f"ERROR {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
