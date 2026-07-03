"""
Analyze-url handler — EdgeOne Makers Python cloud function.

POST /analyze-url
  Body:    { "url": "https://...", "tree": { "topic": "...", "nodes": [...] } }
  Returns: { "matchedNodeIds": ["n1a", "n2b"], "justification": "..." }

Fetches the given URL, strips HTML to plain text, then calls the AI Gateway
to determine which learning tree leaf nodes the content substantially covers.
"""

import json
import os
import re
import sys
import time
import traceback
import urllib.request
import urllib.error
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler

# EdgeOne loads each index.py as a top-level module without package context,
# so the parent directory must be on sys.path to import sibling helpers.
_PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PARENT_DIR not in sys.path:
    sys.path.insert(0, _PARENT_DIR)

from _logger import create_logger  # noqa: E402

logger = create_logger("analyze-url")

# ── Environment ──────────────────────────────────────────────────────────────

_API_KEY = os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("ANTHROPIC_API_KEY") or ""
_BASE_URL = os.environ.get("AI_GATEWAY_BASE_URL") or os.environ.get("ANTHROPIC_BASE_URL") or ""
_MODEL = os.environ.get("AI_GATEWAY_MODEL") or "@makers/deepseek-v4-flash"

_URL_FETCH_TIMEOUT = 10  # seconds
_MAX_WORDS = 4000

# Regex to strip optional markdown code fences from LLM output.
_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*\n?(.*?)\n?\s*```$", re.DOTALL)


# ── HTML text extraction ────────────────────────────────────────────────────

class _BodyTextExtractor(HTMLParser):
    """Simple HTML parser that extracts visible text from the <body> tag."""

    # Tags whose content should be skipped entirely.
    _SKIP_TAGS = frozenset({"script", "style", "noscript", "svg", "head"})

    def __init__(self):
        super().__init__()
        self._in_body = False
        self._skip_depth = 0
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs):
        if tag == "body":
            self._in_body = True
        if tag in self._SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag: str):
        if tag in self._SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
        if tag == "body":
            self._in_body = False

    def handle_data(self, data: str):
        if self._in_body and self._skip_depth == 0:
            text = data.strip()
            if text:
                self._parts.append(text)

    def get_text(self) -> str:
        return " ".join(self._parts)


def _html_to_text(html: str) -> str:
    """Extract visible text from HTML body, skipping script/style/head."""
    parser = _BodyTextExtractor()
    parser.feed(html)
    return parser.get_text()


def _truncate_words(text: str, max_words: int = _MAX_WORDS) -> str:
    """Truncate text to approximately max_words words."""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words])


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


def _extract_leaf_nodes(tree: dict) -> list[dict]:
    """Extract all leaf nodes (with id and label) from the learning tree."""
    leaves = []
    for node in tree.get("nodes", []):
        for child in node.get("children", []):
            leaves.append({
                "id": child.get("id", ""),
                "label": child.get("label", ""),
            })
    return leaves


def _fetch_url(url: str) -> str:
    """Fetch a URL and return the decoded response body."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (compatible; Learnographer/1.0; "
                "+https://learnographer.app)"
            ),
        },
    )
    with urllib.request.urlopen(req, timeout=_URL_FETCH_TIMEOUT) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def _call_ai_gateway(prompt: str, system: str) -> dict:
    """Call the AI Gateway / Anthropic Messages API and return parsed JSON."""
    base = _BASE_URL.rstrip("/") if _BASE_URL else "https://api.anthropic.com"
    url = f"{base}/v1/messages"

    payload = json.dumps({
        "model": _MODEL,
        "max_tokens": 2048,
        "system": system,
        "messages": [
            {"role": "user", "content": prompt}
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
        url = str(body.get("url") or "").strip()
        tree = body.get("tree") or {}

        logger.log(f"analyze-url: url={url!r} topic={tree.get('topic', '')!r}")

        if not url:
            self._write_json(400, {"error": "Missing required field: url"})
            return

        if not tree or not tree.get("nodes"):
            self._write_json(400, {"error": "Missing required field: tree (with nodes)"})
            return

        if not _API_KEY:
            logger.error("analyze-url: no API key configured")
            self._write_json(500, {"error": "AI Gateway API key is not configured"})
            return

        # ── Step 1: Fetch URL content ────────────────────────────────────
        try:
            raw_html = _fetch_url(url)
        except urllib.error.HTTPError as e:
            logger.error(f"analyze-url fetch HTTP error: url={url!r} status={e.code}")
            self._write_json(422, {
                "error": f"Failed to fetch URL: HTTP {e.code}",
                "matchedNodeIds": [],
                "justification": f"Could not retrieve the page (HTTP {e.code}).",
            })
            return
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            logger.error(f"analyze-url fetch error: url={url!r} err={e!r}")
            self._write_json(422, {
                "error": f"Failed to fetch URL: {type(e).__name__}",
                "matchedNodeIds": [],
                "justification": "Could not retrieve the page (connection error or timeout).",
            })
            return

        # ── Step 2: Extract and truncate text ────────────────────────────
        page_text = _html_to_text(raw_html)
        if not page_text.strip():
            logger.log("analyze-url: no text content extracted from URL")
            self._write_json(200, {
                "matchedNodeIds": [],
                "justification": "No readable text content could be extracted from this URL.",
            })
            return

        page_text = _truncate_words(page_text)

        # ── Step 3: Build LLM prompt and call AI Gateway ─────────────────
        leaf_nodes = _extract_leaf_nodes(tree)
        if not leaf_nodes:
            self._write_json(200, {
                "matchedNodeIds": [],
                "justification": "The learning tree has no leaf nodes to match against.",
            })
            return

        leaf_list = "\n".join(
            f"- {leaf['id']}: {leaf['label']}" for leaf in leaf_nodes
        )

        system_prompt = (
            "You are a content analysis assistant. You will be given a list of "
            "learning tree leaf nodes (each with an id and label) and the text "
            "content of a web page. Determine which leaf nodes the page content "
            "substantially covers.\n\n"
            "Return ONLY valid JSON, no markdown, no prose, no code fences.\n\n"
            "Response schema:\n"
            "{\n"
            '  "matchedNodeIds": ["n1a", "n2b"],\n'
            '  "justification": "Brief explanation of why these nodes match."\n'
            "}\n\n"
            "Rules:\n"
            '- Only include a node id in "matchedNodeIds" if the content '
            "SUBSTANTIALLY covers that topic (not just a brief mention)\n"
            "- If no nodes are substantially covered, return an empty array\n"
            "- Keep the justification concise (1-2 sentences)\n"
            "- Output ONLY the JSON object, nothing else"
        )

        user_prompt = (
            f"Learning tree topic: {tree.get('topic', 'Unknown')}\n\n"
            f"Leaf nodes:\n{leaf_list}\n\n"
            f"Page content:\n{page_text}"
        )

        try:
            result = _call_ai_gateway(user_prompt, system_prompt)

            # Ensure expected shape
            matched = result.get("matchedNodeIds", [])
            justification = result.get("justification", "")

            # Validate that matched IDs are actually in the tree
            valid_ids = {leaf["id"] for leaf in leaf_nodes}
            matched = [nid for nid in matched if nid in valid_ids]

            elapsed_ms = int((time.time() - start) * 1000)
            logger.log(
                f"analyze-url: matched {len(matched)} nodes in {elapsed_ms}ms"
            )

            self._write_json(200, {
                "matchedNodeIds": matched,
                "justification": justification,
            })

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            logger.error(
                f"analyze-url AI Gateway HTTP error: status={e.code} "
                f"url={url!r} body={error_body[:500]}"
            )
            self._write_json(502, {"error": f"AI Gateway returned HTTP {e.code}"})

        except urllib.error.URLError as e:
            logger.error(f"analyze-url AI Gateway connection error: {e.reason}")
            self._write_json(502, {"error": "Failed to connect to AI Gateway"})

        except json.JSONDecodeError as e:
            logger.error(f"analyze-url JSON parse error: {e}")
            logger.error(f"traceback:\n{traceback.format_exc()}")
            self._write_json(502, {"error": "AI Gateway returned invalid JSON"})

        except Exception as e:
            logger.error(
                f"analyze-url failed: url={url!r} "
                f"type={type(e).__name__} err={e!r}"
            )
            logger.error(f"traceback:\n{traceback.format_exc()}")
            self._write_json(500, {"error": "Internal server error"})
