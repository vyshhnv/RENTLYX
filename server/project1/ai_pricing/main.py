import os
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_ollama import ChatOllama

# ==========================================
# APP SETUP
# ==========================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# AI MODELS
# ==========================================
llm = ChatOllama(model="mistral", temperature=0.4)
intent_llm = ChatOllama(model="mistral", temperature=0)

# ==========================================
# DATABASE
# ==========================================
DB_PATH = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "db.sqlite3"
))

# ==========================================
# COLUMN MAP (read schema at startup)
# ==========================================
def get_column_names():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(app1_properties)")
        cols = cursor.fetchall()
        conn.close()
        col_map = {c[1]: c[0] for c in cols}
        print("✅ DB columns:", col_map)
        return col_map
    except Exception as e:
        print(f"❌ DB column read error: {e}")
        return {}

print(f"📁 DB_PATH: {DB_PATH}")
print(f"📦 DB exists: {os.path.exists(DB_PATH)}")
COLUMNS = get_column_names()

# ==========================================
# REQUEST MODEL
# ==========================================
class ChatRequest(BaseModel):
    question: str
    session_id: str = "guest"

# ==========================================
# USER PROFILE (IN-MEMORY)
# ==========================================
user_profiles = {}
chat_context = {}

# ==========================================
# SAFE ROW ACCESSORS
# ==========================================
def safe_get_price(row):
    for col_name in ["price", "rent", "monthly_rent", "amount"]:
        if col_name in COLUMNS:
            idx = COLUMNS[col_name]
            try:
                return int(float(str(row[idx]).replace(",", "").replace("₹", "").strip()))
            except (ValueError, IndexError):
                pass
    # fallback: scan all fields for a number > 1000
    for val in row:
        try:
            v = int(float(str(val).replace(",", "").replace("₹", "").strip()))
            if 1000 < v < 10000000:
                return v
        except (ValueError, TypeError):
            continue
    return 0

def safe_get_name(row):
    for col_name in ["name", "title", "property_name"]:
        if col_name in COLUMNS:
            return str(row[COLUMNS[col_name]]).lower()
    return str(row[1]).lower() if len(row) > 1 else "unknown"

def safe_get_location(row):
    for col_name in ["property_place", "location", "place", "area", "city"]:
        if col_name in COLUMNS:
            return str(row[COLUMNS[col_name]]).lower()
    return str(row[2]).lower() if len(row) > 2 else "unknown"

def safe_get_id(row):
    if "id" in COLUMNS:
        return row[COLUMNS["id"]]
    return row[0]

# ==========================================
# INTENT DETECTION
# ==========================================
def detect_intent(user_msg):
    prompt = f"""Classify the user message into exactly one intent word from this list:
greeting, search, price_filter, more_expensive, comparison, recommend

User: {user_msg}
Intent (one word only):"""
    try:
        result = intent_llm.invoke(prompt).content.strip().lower()
        # clean up in case model returns extra words
        for intent in ["greeting", "search", "price_filter", "more_expensive", "comparison", "recommend"]:
            if intent in result:
                return intent
        return "search"
    except Exception as e:
        print(f"Intent detection error: {e}")
        return "search"

# ==========================================
# USER PROFILE UPDATE
# ==========================================
KNOWN_PLACES = [
    "mavoor", "medical", "kozhikode", "mukkam",
    "calicut", "bilathikulam", "chevayur", "west hill",
    "east hill", "nadakkavu", "palayam", "arayidathupalam"
]

def update_profile(session_id, user_msg):
    profile = user_profiles.get(session_id, {
        "budget": None,
        "type": None,
        "location": None
    })

    # property type
    if "villa" in user_msg:
        profile["type"] = "villa"
    elif "flat" in user_msg or "apartment" in user_msg or "bhk" in user_msg:
        profile["type"] = "flat"
    elif "house" in user_msg:
        profile["type"] = "house"

    # budget preference
    if "cheap" in user_msg or "affordable" in user_msg or "low" in user_msg:
        profile["budget"] = "low"
    elif "expensive" in user_msg or "luxury" in user_msg or "premium" in user_msg:
        profile["budget"] = "high"

    # location
    for place in KNOWN_PLACES:
        if place in user_msg:
            profile["location"] = place
            break

    user_profiles[session_id] = profile
    return profile

# ==========================================
# SQL SEARCH
# ==========================================
def search_sql(user_msg):
    if not os.path.exists(DB_PATH):
        print(f"❌ DB not found at: {DB_PATH}")
        return []

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = "SELECT * FROM app1_properties WHERE 1=1"
    params = []

    # property type filters
    if "villa" in user_msg:
        query += " AND name LIKE ?"
        params.append("%villa%")
    elif "flat" in user_msg or "apartment" in user_msg:
        query += " AND name LIKE ?"
        params.append("%flat%")
    elif "house" in user_msg:
        query += " AND name LIKE ?"
        params.append("%house%")

    # location filters
    for place in KNOWN_PLACES:
        if place in user_msg:
            query += " AND property_place LIKE ?"
            params.append(f"%{place}%")
            break

    query += " LIMIT 20"

    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        print(f"🔍 SQL returned {len(rows)} rows for: '{user_msg}'")
    except Exception as e:
        print(f"❌ SQL error: {e}")
        rows = []
    finally:
        conn.close()

    return rows

# ==========================================
# RANKING ENGINE
# ==========================================
def rank_properties(rows, user_msg, profile):
    if not rows:
        return []

    ranked = []

    for r in rows:
        name = safe_get_name(r)
        loc = safe_get_location(r)
        price = safe_get_price(r)
        score = 0

        # location match
        if profile.get("location") and profile["location"] in loc:
            score += 30

        # type match
        if profile.get("type") and profile["type"] in name:
            score += 20

        # budget scoring
        if profile.get("budget") == "low" and price > 0:
            score += max(0, 15000 - price) / 100
        elif profile.get("budget") == "high" and price > 0:
            score += price / 1000

        # keyword match from user message
        for w in user_msg.split():
            if len(w) > 3 and (w in name or w in loc):
                score += 5

        ranked.append((score, r))

    ranked.sort(reverse=True, key=lambda x: x[0])
    return [r for _, r in ranked[:5]]

# ==========================================
# RECOMMENDATION ENGINE
# ==========================================
def recommend(rows, profile):
    return rank_properties(rows, "", profile)

# ==========================================
# GENERATE RESPONSE VIA LLM
# ==========================================
def generate_response(rows):
    if not rows:
        return (
            "😕 I couldn't find any matching properties right now. "
            "Try searching with area names like 'flats in Mukkam' or 'villa near Medical College'."
        )

    lines = []
    for r in rows:
        name = safe_get_name(r).title()
        loc = safe_get_location(r).title()
        price = safe_get_price(r)
        price_str = f"₹{price:,}/month" if price else "Price on request"
        lines.append(f"• {name} in {loc} — {price_str}")

    context = "\n".join(lines)

    prompt = f"""You are a friendly and helpful real estate assistant for RentlyX, a property rental platform in Kozhikode, Kerala.

Based on these available properties, give a warm and natural recommendation in under 80 words:

{context}

Response:"""

    try:
        return llm.invoke(prompt).content.strip()
    except Exception as e:
        print(f"LLM error: {e}")
        return f"Here are some properties I found:\n\n{context}"

# ==========================================
# CHAT ENDPOINT
# ==========================================
@app.post("/chat")
async def chat(req: ChatRequest):
    user_msg = req.question.lower().strip()
    print(f"\n💬 [{req.session_id}] User: {user_msg}")

    intent = detect_intent(user_msg)
    profile = update_profile(req.session_id, user_msg)
    print(f"🎯 Intent: {intent} | Profile: {profile}")

    # GREETING
    if intent == "greeting":
        return {"answer": "Hey there! 👋 I'm your RentlyX assistant. Looking for a flat, villa, or house in Kozhikode? Just tell me what you need!"}

    # SQL SEARCH
    rows = search_sql(user_msg)

    # SAVE CONTEXT
    if rows:
        chat_context[req.session_id] = safe_get_location(rows[0])

    # USE SAVED CONTEXT IF NO RESULTS
    if not rows and req.session_id in chat_context:
        print(f"🔁 Using saved context: {chat_context[req.session_id]}")
        rows = search_sql(chat_context[req.session_id])

    # RANK RESULTS
    ranked = rank_properties(rows, user_msg, profile)

    # INTENT-SPECIFIC HANDLING
    if intent == "recommend":
        ranked = recommend(rows, profile)

    elif intent == "more_expensive":
        ranked = sorted(rows, key=lambda r: safe_get_price(r), reverse=True)[:5]

    elif intent == "price_filter":
        ranked = sorted(rows, key=lambda r: safe_get_price(r))[:5]

    elif intent == "comparison" and len(ranked) >= 2:
        r1, r2 = ranked[0], ranked[1]
        return {
            "answer": (
                f"Comparing top 2 options:\n\n"
                f"🏠 **{safe_get_name(r1).title()}** — {safe_get_location(r1).title()} — ₹{safe_get_price(r1):,}/month\n"
                f"🏠 **{safe_get_name(r2).title()}** — {safe_get_location(r2).title()} — ₹{safe_get_price(r2):,}/month\n\n"
                f"I'd recommend the first one based on your preferences!"
            )
        }

    # FINAL RESPONSE
    answer = generate_response(ranked)
    print(f"🤖 Response: {answer[:80]}...")
    return {"answer": answer}


# ==========================================
# HEALTH CHECK
# ==========================================
from fastapi.responses import JSONResponse

@app.options("/chat")
async def options_chat():
    return JSONResponse(content={"status": "ok"})
@app.get("/")
def health():
    return {
        "status": "✅ AI system running",
        "db_path": DB_PATH,
        "db_found": os.path.exists(DB_PATH),
        "columns": list(COLUMNS.keys())
    }