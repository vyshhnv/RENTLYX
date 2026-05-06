import sqlite3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from langchain_ollama import ChatOllama
except ImportError:
    ChatOllama = None


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = None
intent_llm = None
chat_backend = "fallback"
chat_note = ""
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
AI_MODEL = os.getenv("AI_MODEL", "mistral")

if ChatOllama is not None:
    try:
        llm = ChatOllama(model=AI_MODEL, temperature=0.4, base_url=OLLAMA_BASE_URL)
        intent_llm = ChatOllama(model=AI_MODEL, temperature=0, base_url=OLLAMA_BASE_URL)
        chat_backend = "ollama"
    except Exception as exc:
        chat_note = str(exc)
else:
    chat_note = "langchain_ollama is not installed"


DB_PATH = "C:/Users/NITRO/Desktop/RentlyX/server/project1/db.sqlite3"


class ChatRequest(BaseModel):
    question: str
    session_id: str = "guest"


user_profiles = {}
chat_context = {}

LOCATION_WORDS = {
    "mavoor",
    "medical",
    "kozhikode",
    "bilathikulam",
    "chevayur",
    "feroke",
    "kunnamangalam",
    "malaparamba",
    "nadakkavu",
    "thondayad",
}


def detect_intent(user_msg):
    if intent_llm is None:
        lowered = user_msg.lower()
        if any(word in lowered for word in ["hello", "hi", "hey"]):
            return "greeting"
        if any(word in lowered for word in ["recommend", "suggest", "best"]):
            return "recommend"
        if any(word in lowered for word in ["compare", "better", "which one"]):
            return "comparison"
        if any(word in lowered for word in ["expensive", "premium", "luxury"]):
            return "more_expensive"
        return "search"

    prompt = f"""
Classify intent:

greeting
search
price_filter
more_expensive
comparison
recommend

User: {user_msg}
Intent:
"""
    return intent_llm.invoke(prompt).content.strip().lower()


def update_profile(session_id, user_msg):
    profile = user_profiles.get(
        session_id,
        {"budget": None, "type": None, "location": None},
    )

    if "villa" in user_msg:
        profile["type"] = "villa"
    if "flat" in user_msg:
        profile["type"] = "flat"
    if "house" in user_msg:
        profile["type"] = "house"
    if "apartment" in user_msg:
        profile["type"] = "apartment"

    if "cheap" in user_msg or "budget" in user_msg or "affordable" in user_msg:
        profile["budget"] = "low"
    if "expensive" in user_msg or "luxury" in user_msg or "premium" in user_msg:
        profile["budget"] = "high"

    for word in user_msg.split():
        if word in LOCATION_WORDS:
            profile["location"] = word

    user_profiles[session_id] = profile
    return profile


def search_sql(user_msg):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = """
        SELECT *
        FROM app1_properties
        WHERE (listing_status = 'approved' OR listing_status IS NULL OR listing_status = '')
    """
    params = []

    if "villa" in user_msg:
        query += " AND property_type LIKE ?"
        params.append("%villa%")
    if "flat" in user_msg:
        query += " AND property_type LIKE ?"
        params.append("%flat%")
    if "house" in user_msg:
        query += " AND property_type LIKE ?"
        params.append("%house%")
    if "apartment" in user_msg:
        query += " AND property_type LIKE ?"
        params.append("%apartment%")

    for location in LOCATION_WORDS:
        if location in user_msg:
            query += " AND property_place LIKE ?"
            params.append(f"%{location}%")

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows


def extract_price(row):
    return int(row["price"] or 0)


def rank_properties(rows, user_msg, profile):
    ranked = []

    for row in rows:
        name = str(row["name"]).lower()
        location = str(row["property_place"]).lower()
        price = int(row["price"] or 0)
        score = 0

        if profile["location"] and profile["location"] in location:
            score += 30
        if profile["type"] and profile["type"] in str(row["property_type"]).lower():
            score += 20
        if profile["budget"] == "low":
            score += max(0, 15000 - price) / 100
        if profile["budget"] == "high":
            score += price / 1000

        for word in user_msg.split():
            if word in name or word in location:
                score += 5

        ranked.append((score, row))

    ranked.sort(reverse=True, key=lambda item: item[0])
    return [row for _, row in ranked[:5]]


def recommend(rows, profile):
    return rank_properties(rows, "", profile)


def generate_response(rows):
    if not rows:
        return "I could not find any matching properties in that area."

    if llm is None:
        lines = [
            f"{index}. {row['name']} in {row['property_place']} for Rs. {row['price']}"
            for index, row in enumerate(rows[:3], start=1)
        ]
        return "Here are the best matches I found:\n\n" + "\n".join(lines)

    context = "\n".join(
        f"{row['name']} in {row['property_place']} for Rs. {row['price']}"
        for row in rows
    )

    prompt = f"""
You are a friendly real estate assistant.

Generate a natural response recommending these properties:

{context}

Response:
"""
    return llm.invoke(prompt).content


@app.post("/chat")
async def chat(req: ChatRequest):
    user_msg = req.question.lower().strip()

    intent = detect_intent(user_msg)
    profile = update_profile(req.session_id, user_msg)

    if intent == "greeting":
        return {"answer": "Hey, what kind of place are you looking for in Kozhikode?"}

    rows = search_sql(user_msg)

    if rows:
        chat_context[req.session_id] = str(rows[0]["property_place"]).lower()

    if not rows and req.session_id in chat_context:
        rows = search_sql(chat_context[req.session_id])

    ranked = rank_properties(rows, user_msg, profile)

    if intent == "recommend":
        ranked = recommend(rows, profile)
    if intent == "more_expensive":
        ranked = sorted(rows, key=extract_price, reverse=True)[:5]
    if intent == "comparison" and len(ranked) >= 2:
        top = ranked[0]
        return {
            "answer": (
                f"I would recommend this one first:\n\n"
                f"{top['name']} in {top['property_place']} for Rs. {top['price']}"
            )
        }

    return {"answer": generate_response(ranked)}


@app.get("/")
def health():
    return {
        "status": "AI system running",
        "backend": chat_backend,
        "note": chat_note or "ready",
        "model": AI_MODEL,
        "ollama_base_url": OLLAMA_BASE_URL,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8001)
