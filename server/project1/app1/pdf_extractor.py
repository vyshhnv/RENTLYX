import re
import json
import os
from pypdf import PdfReader

try:
    import ollama
except ImportError:
    ollama = None


OLLAMA_MODEL = os.getenv("PDF_OLLAMA_MODEL", os.getenv("AI_MODEL", "llama3.2:1b"))
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")


def read_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


def extract_with_ollama(text):
    snippet = text[:2000].strip()

    # ── DEBUG: show what the PDF text actually looks like ──────────────────
    print("\n" + "="*60)
    print("PDF TEXT (first 500 chars):")
    print(repr(snippet[:500]))
    print("="*60 + "\n")

    if not snippet:
        print("⚠️  PDF text is EMPTY — likely a scanned/image PDF, needs OCR.")
        return _empty()

    prompt = f"""Extract rental agreement details and return ONLY this JSON with values filled in:

{{
  "rent_amount": null,
  "security_deposit": null,
  "lease_duration": null,
  "notice_period": null,
  "pets_allowed": null,
  "maintenance_responsibility": null
}}

Use exact values from the text below. Set null if not found. No explanation.

{snippet}"""

    try:
        response = ollama.chat(
            model="llama3.2:1b",
            messages=[{"role": "user", "content": prompt}],
            options={
                "temperature": 0,
                "num_predict": 300,
                "stop": ["```", "\n\nNote", "\n\nThe", "\n\nThis"],
            },
        )
        raw = response["message"]["content"].strip()

        # ── DEBUG: show raw model output ───────────────────────────────────
        print("\n" + "="*60)
        print("RAW MODEL OUTPUT:")
        print(repr(raw))
        print("="*60 + "\n")

    except Exception as e:
        print(f"❌ Ollama error: {e}")
        return _empty()

    # Strip markdown fences
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()

    # Try to find a JSON block
    match = re.search(r"\{.*?\}", raw, re.DOTALL)
    if not match:
        # Last resort: try parsing the whole thing
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            print(f"❌ No JSON block found. Raw was: {repr(raw)}")
            return _empty()
    else:
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as e:
            print(f"❌ JSON parse error: {e} | block: {repr(match.group(0))}")
            return _empty()

    result = {
        "rent_amount":                _clean(data.get("rent_amount")),
        "security_deposit":           _clean(data.get("security_deposit")),
        "lease_duration":             _clean(data.get("lease_duration")),
        "notice_period":              _clean(data.get("notice_period")),
        "pets_allowed":               _clean(data.get("pets_allowed")),
        "maintenance_responsibility": _clean(data.get("maintenance_responsibility")),
    }

    print("✅ Extracted result:", result)
    return result


def _clean(v):
    if v is None:
        return "Not specified"
    s = str(v).strip()
    if s.lower() in ("null", "none", "", "not mentioned", "not specified", "n/a"):
        return "Not specified"
    return s


def _empty():
    return {
        "rent_amount":                "Not specified",
        "security_deposit":           "Not specified",
        "lease_duration":             "Not specified",
        "notice_period":              "Not specified",
        "pets_allowed":               "Not specified",
        "maintenance_responsibility": "Not specified",
    }


def extract_rental_terms(file_path):
    text = read_pdf(file_path)
    return extract_with_ollama(text)
