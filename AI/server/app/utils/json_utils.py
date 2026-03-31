from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional


def extract_first_json_object(text: str) -> Optional[Dict[str, Any]]:
    m = re.search(r"\{[\s\S]*?\}", text, flags=re.DOTALL)
    if not m:
        return None
    try:
        obj = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, dict) else None
