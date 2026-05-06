import json
import os
import re
import sqlite3
import traceback

import joblib
import numpy as np
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    from langchain_community.vectorstores import Chroma
except ImportError:
    Chroma = None

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    HuggingFaceEmbeddings = None

try:
    from langchain_ollama import ChatOllama
except ImportError:
    ChatOllama = None


MODEL_PATH = os.path.join(os.path.dirname(__file__), "rentlyx_model_.pkl")
OLLAMA_BASE_URL = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
AI_MODEL = getattr(settings, "AI_MODEL", "mistral")
PROPERTY_TYPES = ("apartment", "villa", "house", "flat")
LOCATION_WORDS = {
    "balussery",
    "beach",
    "bilathikulam",
    "calicut",
    "chevayur",
    "eranhipalam",
    "feroke",
    "koduvally",
    "kottuli",
    "koyilandy",
    "kunnamangalam",
    "kuthiravattom",
    "malaparamba",
    "mankave",
    "mathara",
    "mavoor",
    "medical",
    "mukkam",
    "nadakkavu",
    "palayam",
    "panniyankara",
    "puthiyara",
    "thiruvannur",
    "thondayad",
    "ulliyeri",
    "vellimadukunnu",
    "kozhikode",
}

MISTRAL_AI = None
SEARCH_EMBEDDER = None
CHAT_BACKEND = "fallback"
CHAT_DISABLED_REASON = ""
rentlyx_model = {}
model = None
locality_map = {}
locality_avg = {}
bhk_avg = {}
global_avg = 0
localities = []
apartment_map = {}
apartment_avg = {}

DJANGO_TO_PKL_PROP_TYPE = {
    "apartment": "Apartment",
    "flat": "Flat",
    "house": "House",
    "villa": "Villa",
}

DJANGO_TO_PKL_BHK = {
    "1bhk": 1,
    "2bhk": 2,
    "3bhk": 3,
    "4bhk+": 4,
}


def load_price_model():
    global rentlyx_model, model, locality_map, locality_avg
    global bhk_avg, global_avg, localities, apartment_map, apartment_avg

    try:
        rentlyx_model = joblib.load(MODEL_PATH)
        model = rentlyx_model["model"]
        locality_map = rentlyx_model["locality_map"]
        locality_avg = rentlyx_model["locality_avg"]
        bhk_avg = rentlyx_model["bhk_avg"]
        global_avg = rentlyx_model["global_avg"]
        localities = rentlyx_model.get("localities", [])
        apartment_map = rentlyx_model["apartment_map"]
        apartment_avg = rentlyx_model["apartment_avg"]
        print("RentlyX price model loaded successfully")
    except FileNotFoundError:
        print(f"Price model not found at {MODEL_PATH}")
        model = None
    except Exception:
        print("Price model failed to load:")
        traceback.print_exc()
        model = None


def initialize_chat_backend():
    global MISTRAL_AI, SEARCH_EMBEDDER, CHAT_BACKEND, CHAT_DISABLED_REASON

    if ChatOllama is None:
        CHAT_DISABLED_REASON = "langchain_ollama is not installed"
        return

    try:
        MISTRAL_AI = ChatOllama(
            model=AI_MODEL,
            temperature=0.3,
            base_url=OLLAMA_BASE_URL,
        )
        CHAT_BACKEND = "ollama"
        if HuggingFaceEmbeddings is not None and Chroma is not None:
            SEARCH_EMBEDDER = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
        print(f"AI chat backend ready: {CHAT_BACKEND} ({AI_MODEL} @ {OLLAMA_BASE_URL})")
    except Exception as exc:
        CHAT_BACKEND = "fallback"
        CHAT_DISABLED_REASON = str(exc)
        MISTRAL_AI = None
        SEARCH_EMBEDDER = None
        print(f"Falling back to rule-based AI chat: {exc}")


def tokenize(text):
    return re.findall(r"[a-z0-9+]+", (text or "").lower())


def get_property_data():
    db_path = os.path.join(settings.BASE_DIR, "db.sqlite3")
    conn = None

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT *
            FROM app1_properties
            WHERE listing_status = 'approved' OR listing_status IS NULL OR listing_status = ''
            ORDER BY created_at DESC
            """
        )
        return [dict(row) for row in cursor.fetchall()]
    except Exception as exc:
        print(f"Database Error: {exc}")
        return []
    finally:
        if conn is not None:
            conn.close()


def score_property(row, user_msg):
    tokens = set(tokenize(user_msg))
    haystack = " ".join(
        str(row.get(key, ""))
        for key in ("name", "property_place", "description", "property_type", "purpose", "bhk", "city")
    ).lower()
    haystack_tokens = set(tokenize(haystack))
    score = 0

    for token in tokens:
        if token in haystack_tokens:
            score += 6

    if any(token in LOCATION_WORDS for token in tokens):
        for token in tokens:
            if token in LOCATION_WORDS and token in haystack:
                score += 10

    property_type = str(row.get("property_type", "")).lower()
    for expected_type in PROPERTY_TYPES:
        if expected_type in tokens and property_type == expected_type:
            score += 10

    purpose = str(row.get("purpose", "")).lower()
    if "rent" in tokens and purpose == "rent":
        score += 8
    if any(word in tokens for word in ("buy", "sale", "sell")) and purpose == "sale":
        score += 8

    bhk_value = str(row.get("bhk", "")).lower()
    if bhk_value and bhk_value in tokens:
        score += 8
    else:
        for token in tokens:
            if token and token[0].isdigit() and token[0] in bhk_value:
                score += 4

    try:
        price = float(row.get("price") or 0)
    except (TypeError, ValueError):
        price = 0

    if any(word in tokens for word in ("cheap", "budget", "affordable")):
        score += max(0, 15000 - price) / 2000
    if any(word in tokens for word in ("luxury", "premium", "expensive")):
        score += price / 50000

    return score


def format_property_line(row):
    name = row.get("name") or "Property"
    location = row.get("property_place") or row.get("city") or "Unknown location"
    price = row.get("price") or "N/A"
    purpose = "per month" if str(row.get("purpose", "")).lower() == "rent" else "total"
    property_type = str(row.get("property_type") or "").title()
    bhk_value = str(row.get("bhk") or "").upper()
    return f"{name} in {location} ({property_type} {bhk_value}) for Rs. {price} {purpose}"


def find_matching_properties(user_msg, limit=3):
    properties = get_property_data()
    if not properties:
        return []

    scored = sorted(
        properties,
        key=lambda row: (score_property(row, user_msg), row.get("created_at", "")),
        reverse=True,
    )
    matches = [row for row in scored if score_property(row, user_msg) > 0]
    return (matches or scored)[:limit]


def build_fallback_answer(user_msg, matches):
    if not matches:
        return "I could not find a matching property right now. Try asking with a locality, BHK, or property type."

    intro = "Here are the closest matches I found:"
    if any(word in user_msg.lower() for word in ("recommend", "suggest", "best")):
        intro = "These look like the best matches for your request:"

    lines = [
        f"{index}. {format_property_line(row)}"
        for index, row in enumerate(matches, start=1)
    ]
    return intro + "\n\n" + "\n".join(lines)


def build_llm_answer(user_msg, matches):
    if MISTRAL_AI is None:
        return build_fallback_answer(user_msg, matches)

    context = "\n".join(
        f"- {format_property_line(row)}. Description: {row.get('description') or 'No description provided.'}"
        for row in matches
    )
    prompt = f"""
You are the RentlyX real estate assistant.
Answer using only the property records below.
If the records do not answer the question, clearly say that.

Property records:
{context}

User question:
{user_msg}

Helpful answer:
""".strip()

    response = MISTRAL_AI.invoke(prompt)
    return getattr(response, "content", str(response)).strip()


load_price_model()
initialize_chat_backend()


@csrf_exempt
def ask_mistral_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Use POST method"}, status=405)

    try:
        data = json.loads(request.body)
        user_msg = data.get("message", "").strip()

        if not user_msg:
            return JsonResponse({"status": "error", "answer": "Message cannot be empty."}, status=400)

        matches = find_matching_properties(user_msg, limit=3)
        if not matches:
            return JsonResponse({"status": "error", "answer": "No property listings found in database."})

        answer = build_llm_answer(user_msg, matches)
        return JsonResponse({
            "status": "success",
            "answer": answer,
            "backend": CHAT_BACKEND,
        })
    except Exception as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=500)


class PredictPriceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if model is None:
            return Response({"error": "AI model not available."}, status=503)

        bhk_raw = request.data.get("bhk")
        locality_raw = request.data.get("locality")
        prop_type_raw = request.data.get("property_type")
        floor_raw = request.data.get("floor", 1)

        if not bhk_raw or not locality_raw:
            return Response({"error": "bhk and locality are required"}, status=400)

        bhk_str = str(bhk_raw).strip().lower()
        bhk_int = DJANGO_TO_PKL_BHK.get(bhk_str)
        if bhk_int is None:
            match = re.search(r"\d+", bhk_str)
            if not match:
                return Response({"error": "Invalid bhk value"}, status=400)
            bhk_int = min(int(match.group()), 4)

        try:
            floor = int(floor_raw)
        except (TypeError, ValueError):
            floor = 1

        locality_name = locality_raw.strip()
        locality_key = locality_name
        if locality_key not in locality_avg:
            locality_key = locality_name.title()

        known = locality_key in locality_avg
        loc_avg = locality_avg.get(locality_key, global_avg)
        loc_encoded = locality_map.get(locality_key, -1)

        raw_lower = (prop_type_raw or "apartment").strip().lower()
        pkl_prop_key = DJANGO_TO_PKL_PROP_TYPE.get(raw_lower, "Apartment")
        apt_encoded = apartment_map.get(pkl_prop_key, 0)
        apt_avg_val = apartment_avg.get(pkl_prop_key, global_avg)
        bhk_avg_val = bhk_avg.get(bhk_int, global_avg)

        values = np.array(
            [[bhk_int, loc_encoded, apt_encoded, floor, loc_avg, bhk_avg_val, apt_avg_val]]
        )

        try:
            rf_price = model.predict(values)[0]
        except Exception as exc:
            return Response({"error": f"Prediction failed: {exc}"}, status=500)

        if known:
            price, conf, margin = 0.90 * rf_price + 0.10 * apt_avg_val, "High", 0.12
        elif bhk_int in bhk_avg:
            price, conf, margin = 0.85 * rf_price + 0.15 * bhk_avg_val, "Medium", 0.20
        else:
            price, conf, margin = rf_price, "Low", 0.30

        return Response({
            "predicted_price": round(price),
            "range_low": round(price * (1 - margin)),
            "range_high": round(price * (1 + margin)),
            "confidence": conf,
            "locality": locality_name,
            "bhk": bhk_int,
            "floor": floor,
            "property_type": pkl_prop_key,
            "locality_known": known,
        })


class GetLocalitiesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if model is None:
            return Response({"localities": []}, status=200)
        return Response({"localities": sorted(localities), "count": len(localities)})


class ModelInfoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if model is None:
            return Response({"status": "error", "message": "Model not loaded"}, status=503)

        return Response({
            "status": "ok",
            "model_loaded": True,
            "localities_count": len(localities),
            "property_types": list(apartment_map.keys()),
            "model_type": type(model).__name__,
            "features": rentlyx_model.get("feature_cols"),
            "model_version": rentlyx_model.get("version"),
            "city": rentlyx_model.get("city"),
            "chat_backend": CHAT_BACKEND,
            "chat_ready": MISTRAL_AI is not None,
            "chat_note": CHAT_DISABLED_REASON or "AI chat is available",
            "ai_model": AI_MODEL,
            "ollama_base_url": OLLAMA_BASE_URL,
        })


class ChatHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import ChatMessage
        from .serializers import ChatMessageSerializer

        session_id = request.query_params.get("session_id", "default")
        messages = ChatMessage.objects.filter(session_id=session_id)
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request):
        from .models import ChatMessage
        from .serializers import ChatMessageSerializer

        serializer = ChatMessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request):
        from .models import ChatMessage

        session_id = request.query_params.get("session_id", "default")
        ChatMessage.objects.filter(session_id=session_id).delete()
        return Response({"message": "Chat history cleared"})
