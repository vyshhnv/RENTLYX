import json
import os
import re
from urllib import error as urllib_error
from urllib import request as urllib_request

from pypdf import PdfReader


OLLAMA_MODEL = os.getenv("PDF_OLLAMA_MODEL", os.getenv("AI_MODEL", "mistral"))
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

    print("\n" + "=" * 60)
    print("PDF TEXT (first 500 chars):")
    print(repr(snippet[:500]))
    print("=" * 60 + "\n")

    if not snippet:
        print("PDF text is empty. The document likely needs OCR.")
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
        payload = json.dumps({
            "model": OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {
                "temperature": 0,
                "num_predict": 300,
                "stop": ["```", "\n\nNote", "\n\nThe", "\n\nThis"],
            },
        }).encode("utf-8")
        request = urllib_request.Request(
            f"{OLLAMA_BASE_URL.rstrip('/')}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib_request.urlopen(request, timeout=120) as response:
            response_data = json.loads(response.read().decode("utf-8"))
        raw = response_data.get("message", {}).get("content", "").strip()

        print("\n" + "=" * 60)
        print("RAW MODEL OUTPUT:")
        print(repr(raw))
        print("=" * 60 + "\n")
    except (urllib_error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        print(f"Ollama error: {exc}")
        return _empty()

    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()

    match = re.search(r"\{.*?\}", raw, re.DOTALL)
    if not match:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            print(f"No JSON block found. Raw was: {repr(raw)}")
            return _empty()
    else:
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            print(f"JSON parse error: {exc} | block: {repr(match.group(0))}")
            return _empty()

    result = {
        "rent_amount": _clean(data.get("rent_amount")),
        "security_deposit": _clean(data.get("security_deposit")),
        "lease_duration": _clean(data.get("lease_duration")),
        "notice_period": _clean(data.get("notice_period")),
        "pets_allowed": _clean(data.get("pets_allowed")),
        "maintenance_responsibility": _clean(data.get("maintenance_responsibility")),
    }

    print("Extracted result:", result)
    return result


def _clean(value):
    if value is None:
        return "Not specified"
    cleaned = str(value).strip()
    if cleaned.lower() in ("null", "none", "", "not mentioned", "not specified", "n/a"):
        return "Not specified"
    return cleaned


def _empty():
    return {
        "rent_amount": "Not specified",
        "security_deposit": "Not specified",
        "lease_duration": "Not specified",
        "notice_period": "Not specified",
        "pets_allowed": "Not specified",
        "maintenance_responsibility": "Not specified",
    }


def extract_rental_terms(file_path):
    text = read_pdf(file_path)
    return extract_with_ollama(text)
