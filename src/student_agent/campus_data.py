"""Read-only APU campus records, exported from the web portal's data.js.

Single source of truth is src/web/data.js; regenerate the JSON with
`node scripts/export-campus-data.mjs` (CI runs it with --check).
"""
import json
import re
from functools import lru_cache
from pathlib import Path

_DATA_FILE = Path(__file__).parent / "data" / "campus.json"


@lru_cache(maxsize=1)
def load_campus_data() -> dict:
    """Return the campus records (offices, FAQ topics, events, checklist, links). Do not mutate."""
    with _DATA_FILE.open(encoding="utf-8") as handle:
        return json.load(handle)


def normalize(text: str) -> str:
    """Lower-case and collapse everything except letters and digits to single spaces."""
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def contains_phrase(normalized_text: str, phrase: str) -> bool:
    """True when `phrase` appears in `normalized_text` as whole words."""
    return f" {normalize(phrase)} " in f" {normalized_text} "
