"""
Generate-tree handler — EdgeOne Makers Python cloud function.

POST /generate-tree
  Body:    { "topic": "React Hooks" }
  Returns: { "topic": "React Hooks", "nodes": [ ... ] }

Calls the AI Gateway (Anthropic Messages API) with a system prompt that
forces the model to return a structured learning tree as valid JSON.
"""

import json
import os
import re
import sys
import time
import traceback
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler

# EdgeOne loads each index.py as a top-level module without package context,
# so the parent directory must be on sys.path to import sibling helpers.
_PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PARENT_DIR not in sys.path:
    sys.path.insert(0, _PARENT_DIR)

from _logger import create_logger  # noqa: E402

logger = create_logger("generate-tree")

# ── Environment ──────────────────────────────────────────────────────────────

_API_KEY = os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("ANTHROPIC_API_KEY") or ""
_BASE_URL = os.environ.get("AI_GATEWAY_BASE_URL") or os.environ.get("ANTHROPIC_BASE_URL") or ""
_MODEL = os.environ.get("AI_GATEWAY_MODEL") or "@makers/deepseek-v4-flash"

_SYSTEM_PROMPT = (
    "You are a learning curriculum designer. Given a topic, produce a structured "
    "learning tree with 4-8 main subtopics, each with 2-4 leaf subtopics.\n\n"
    "Return ONLY valid JSON, no markdown, no prose, no code fences.\n\n"
    "Schema:\n"
    "{\n"
    '  "topic": "<original topic>",\n'
    '  "nodes": [\n'
    "    {\n"
    '      "id": "n1",\n'
    '      "label": "Branch label",\n'
    '      "children": [\n'
    '        { "id": "n1a", "label": "Leaf label", "status": "not_started" },\n'
    '        { "id": "n1b", "label": "Leaf label", "status": "not_started" }\n'
    "      ]\n"
    "    }\n"
    "  ]\n"
    "}\n\n"
    "Rules:\n"
    "- Branch node ids: n1, n2, n3, ... (no status field)\n"
    "- Leaf node ids: n1a, n1b, n1c, ... n2a, n2b, ... (always include \"status\": \"not_started\")\n"
    "- 4-8 branch nodes, each with 2-4 leaf nodes\n"
    "- Output ONLY the JSON object, nothing else"
)

# Regex to strip optional markdown code fences from LLM output.
_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*\n?(.*?)\n?\s*```$", re.DOTALL)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _read_body(rfile, headers) -> dict:
    """Decode the JSON request body; return an empty dict on any failure."""
    length = int(headers.get("Content-Length") or 0)
    if length <= 0:
        return {}
    try:
        return json.loads(rfile.read(length).decode("utf-8")) or {}
    except (ValueError, UnicodeDecodeError):
        return {}


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences (```json ... ```) if present."""
    stripped = text.strip()
    m = _CODE_FENCE_RE.match(stripped)
    return m.group(1).strip() if m else stripped


def _call_ai_gateway(topic: str) -> dict:
    """Call the AI Gateway / Anthropic Messages API and return parsed JSON."""
    base = _BASE_URL.rstrip("/") if _BASE_URL else "https://api.anthropic.com"
    url = f"{base}/v1/messages"

    payload = json.dumps({
        "model": _MODEL,
        "max_tokens": 4096,
        "system": _SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": f"Create a learning tree for the topic: {topic}"}
        ],
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-api-key": _API_KEY,
            "anthropic-version": "2023-06-01",
        },
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        resp_data = json.loads(resp.read().decode("utf-8"))

    raw_text = resp_data["content"][0]["text"]
    cleaned = _strip_code_fences(raw_text)
    return json.loads(cleaned)


# ── Handler ──────────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def _write_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=UTF-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        start = time.time()

        body = _read_body(self.rfile, self.headers)
        topic = str(body.get("topic") or "").strip()

        logger.log(f"generate-tree: topic={topic!r}")

        if not topic:
            self._write_json(400, {"error": "Missing required field: topic"})
            return

        if not _API_KEY:
            logger.error("generate-tree: no API key configured")
            self._write_json(500, {"error": "AI Gateway API key is not configured"})
            return

        try:
            tree = _call_ai_gateway(topic)

            elapsed_ms = int((time.time() - start) * 1000)
            node_count = len(tree.get("nodes", []))
            logger.log(f"generate-tree: returned {node_count} nodes in {elapsed_ms}ms")

            self._write_json(200, tree)

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            logger.error(
                f"generate-tree AI Gateway HTTP error: status={e.code} "
                f"topic={topic!r} body={error_body[:500]}"
            )
            self._write_json(502, {"error": f"AI Gateway returned HTTP {e.code}"})

        except urllib.error.URLError as e:
            logger.error(f"generate-tree AI Gateway connection error: {e.reason}")
            self._write_json(502, {"error": "Failed to connect to AI Gateway"})

        except json.JSONDecodeError as e:
            logger.error(f"generate-tree JSON parse error: {e}")
            logger.error(f"traceback:\n{traceback.format_exc()}")
            self._write_json(502, {"error": "AI Gateway returned invalid JSON"})

        except Exception as e:
            logger.error(
                f"generate-tree failed: topic={topic!r} "
                f"type={type(e).__name__} err={e!r}"
            )
            logger.error(f"traceback:\n{traceback.format_exc()}")
            self._write_json(500, {"error": "Internal server error"})
