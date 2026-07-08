# =============================================================================
# KrishiMitra — AI-Powered Farmer Advisory Agent
# Backend: Flask + IBM Watsonx.ai (Granite)
# =============================================================================
import os
import json
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv

# Local config module — edit AGENT_INSTRUCTIONS there
from agent_config import build_system_prompt, PROMPT_TEMPLATES

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Flask app setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-in-prod")
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# IBM Watsonx.ai client initialisation
# ---------------------------------------------------------------------------
IBM_API_KEY    = os.getenv("WATSONX_API_KEY") or os.getenv("IBM_API_KEY", "")
IBM_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID") or os.getenv("IBM_PROJECT_ID", "")
IBM_URL        = os.getenv("WATSONX_URL") or os.getenv("IBM_WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
MODEL_ID       = os.getenv("WATSONX_MODEL_ID", "ibm/granite-13b-chat-v2")
MAX_TOKENS     = int(os.getenv("WATSONX_MAX_TOKENS", "1024"))
TEMPERATURE    = float(os.getenv("WATSONX_TEMPERATURE", "0.7"))
TOP_P          = float(os.getenv("WATSONX_TOP_P", "0.9"))

watsonx_client = None

def get_watsonx_client():
    """Lazily initialise and return the Watsonx.ai client."""
    global watsonx_client
    if watsonx_client is not None:
        return watsonx_client
    if not IBM_API_KEY or not IBM_PROJECT_ID:
        logger.warning("IBM credentials not configured — AI responses will be mocked.")
        return None
    try:
        from ibm_watsonx_ai import APIClient, Credentials
        creds = Credentials(url=IBM_URL, api_key=IBM_API_KEY)
        watsonx_client = APIClient(credentials=creds, project_id=IBM_PROJECT_ID)
        logger.info("Watsonx.ai client initialised successfully.")
        return watsonx_client
    except Exception as exc:
        logger.error("Failed to initialise Watsonx.ai client: %s", exc)
        return None


def call_watsonx(messages: list, farm_profiles: list = None) -> str:
    """
    Call IBM Watsonx.ai with the conversation history.
    Falls back to a mock response when credentials are absent.
    """
    client = get_watsonx_client()
    system_prompt = build_system_prompt(farm_profiles)

    if client is None:
        # --- MOCK MODE (no credentials configured) ---
        user_msg = messages[-1].get("content", "") if messages else ""
        return _mock_response(user_msg)

    try:
        from ibm_watsonx_ai.foundation_models import ModelInference
        from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as Params

        model = ModelInference(
            model_id=MODEL_ID,
            api_client=client,
            params={
                Params.DECODING_METHOD: "sample",
                Params.MAX_NEW_TOKENS: MAX_TOKENS,
                Params.TEMPERATURE: TEMPERATURE,
                Params.TOP_P: TOP_P,
                Params.REPETITION_PENALTY: 1.1,
            },
        )

        # Build prompt — Granite instruct chat format
        prompt_parts = [f"<|system|>\n{system_prompt}\n<|assistant|>"]
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                prompt_parts.append(f"<|user|>\n{content}\n<|assistant|>")
            elif role == "assistant":
                prompt_parts.append(f"{content}\n<|user|>")
        # Remove trailing <|user|> and close properly
        full_prompt = "\n".join(prompt_parts).rstrip("\n<|user|>") + "\n<|assistant|>\n"

        response = model.generate_text(prompt=full_prompt)
        return response.strip() if isinstance(response, str) else str(response)

    except Exception as exc:
        logger.error("Watsonx.ai generation error: %s", exc)
        return (
            "⚠️ I'm having trouble connecting to the AI service right now. "
            "Please check your IBM API credentials in the `.env` file and try again."
        )


def _mock_response(user_input: str) -> str:
    """Return a helpful mock response for demo / no-credentials mode."""
    ui = user_input.lower()
    if any(w in ui for w in ["hello", "hi", "namaste", "hey"]):
        return (
            "🌾 **Namaste, Kisan!** Welcome to KrishiMitra.\n\n"
            "I'm your AI farming advisor. Ask me about crop planning, pest & disease "
            "identification, fertiliser guidance, sowing calendars, or cost-saving tips.\n\n"
            "*Note: Running in demo mode — connect IBM Watsonx.ai credentials for full AI responses.*"
        )
    if any(w in ui for w in ["pest", "disease", "insect", "fungus", "yellow", "spots", "wilt"]):
        return (
            "**Possible Pest / Disease Detection**\n\n"
            "Based on your description, this could be one of:\n"
            "1. **Leaf Blight** — yellowing + brown edges, often fungal\n"
            "2. **Aphid infestation** — sticky residue, curled leaves\n"
            "3. **Nutrient deficiency** (N or Fe) — uniform yellowing\n\n"
            "**Suggested Steps:**\n"
            "- Scout the field carefully at 5 random spots\n"
            "- Check both leaf surfaces for insects/eggs\n"
            "- Collect a sample and visit your nearest KVK\n\n"
            "**Quick Reminder:** Follow label dose for any spray; wear PPE always. 🧤"
        )
    if any(w in ui for w in ["fertiliser", "fertilizer", "npk", "urea", "dap", "soil"]):
        return (
            "**Fertiliser Advisory**\n\n"
            "A balanced approach for most crops:\n"
            "- Get your **Soil Health Card (SHC)** first — it gives precise NPK needs\n"
            "- General baseline: apply basal dose at sowing, split top-dress at tillering/branching\n"
            "- Consider **vermicompost** or **FYM** (10–12 t/ha) to improve soil organic carbon\n\n"
            "**Pro Tip:** Micro-nutrients (Zinc, Boron) are often overlooked — SHC covers these too. 🌱"
        )
    if any(w in ui for w in ["sow", "sowing", "plant", "when", "calendar", "season"]):
        return (
            "**Seasonal Sowing Calendar (General India)**\n\n"
            "| Season | Window | Key Crops |\n"
            "|--------|--------|-----------|\n"
            "| **Kharif** | June–July | Rice, Maize, Soybean, Cotton, Groundnut |\n"
            "| **Rabi** | Oct–Nov | Wheat, Mustard, Gram, Lentil |\n"
            "| **Zaid** | Feb–Mar | Watermelon, Cucumber, Moong |\n\n"
            "Tell me your **state** and **crop** for a more precise window. 📅"
        )
    if any(w in ui for w in ["yield", "production", "harvest", "output"]):
        return (
            "**Yield Improvement Tips**\n\n"
            "1. Use **certified high-yielding varieties** (HYV) suited to your zone\n"
            "2. Follow **recommended plant spacing** — overcrowding reduces yield\n"
            "3. **Timely irrigation** — critical at flowering and grain-fill stages\n"
            "4. Apply **top-dressing** at the right growth stage\n"
            "5. Control weeds in the first 30–45 days (critical period)\n\n"
            "**Pro Tip:** Joining a local **FPO** can give you access to better inputs at lower cost. 📈"
        )
    return (
        "**KrishiMitra Advisory**\n\n"
        "Thank you for your question! I can help you with:\n"
        "- 🌱 Crop Planning & Variety Selection\n"
        "- 🐛 Pest & Disease Identification\n"
        "- 💧 Irrigation & Water Management\n"
        "- 🌾 Fertiliser & Soil Health\n"
        "- 📅 Sowing Calendars\n"
        "- 💰 Cost-Saving Tips & Government Schemes\n\n"
        "Please describe your farming situation and I'll give you personalised advice. 🙏\n\n"
        "*Demo mode active — add IBM Watsonx.ai credentials for full AI-powered responses.*"
    )


# ---------------------------------------------------------------------------
# Session helpers for conversation history & farm profiles
# ---------------------------------------------------------------------------

def get_conversation() -> list:
    return session.get("conversation", [])


def save_conversation(conv: list):
    # Keep last 20 messages to avoid session overflow
    session["conversation"] = conv[-20:]


def get_farm_profiles() -> list:
    return session.get("farm_profiles", [])


def save_farm_profiles(profiles: list):
    session["farm_profiles"] = profiles


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Serve the main UI."""
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    POST { "message": "...", "use_template": "crop_plan", "template_vars": {...} }
    Returns { "reply": "...", "timestamp": "..." }
    """
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()
    use_template  = data.get("use_template")
    template_vars = data.get("template_vars", {})

    if not user_message and not use_template:
        return jsonify({"error": "Message is required."}), 400

    # Apply prompt template if requested
    if use_template and use_template in PROMPT_TEMPLATES:
        try:
            user_message = PROMPT_TEMPLATES[use_template].format(**template_vars)
        except KeyError as e:
            return jsonify({"error": f"Missing template variable: {e}"}), 400

    farm_profiles = get_farm_profiles()
    conversation  = get_conversation()
    conversation.append({"role": "user", "content": user_message})

    reply = call_watsonx(conversation, farm_profiles)
    conversation.append({"role": "assistant", "content": reply})
    save_conversation(conversation)

    return jsonify({"reply": reply, "timestamp": datetime.now().strftime("%H:%M")})


@app.route("/api/conversation/clear", methods=["POST"])
def clear_conversation():
    """Clear the session conversation history."""
    save_conversation([])
    return jsonify({"status": "cleared"})


@app.route("/api/farms", methods=["GET"])
def get_farms():
    """Return all saved farm profiles."""
    return jsonify({"farms": get_farm_profiles()})


@app.route("/api/farms", methods=["POST"])
def add_farm():
    """
    POST { "name": "...", "location": "...", "area": "...",
           "soil_type": "...", "irrigation": "...",
           "current_crops": "...", "notes": "..." }
    """
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Farm name is required."}), 400

    profiles = get_farm_profiles()
    new_profile = {
        "id": int(datetime.now().timestamp() * 1000),
        "name": name,
        "location": data.get("location", ""),
        "area": data.get("area", ""),
        "soil_type": data.get("soil_type", ""),
        "irrigation": data.get("irrigation", ""),
        "current_crops": data.get("current_crops", ""),
        "notes": data.get("notes", ""),
        "created_at": datetime.now().isoformat(),
    }
    profiles.append(new_profile)
    save_farm_profiles(profiles)
    return jsonify({"status": "added", "farm": new_profile}), 201


@app.route("/api/farms/<int:farm_id>", methods=["DELETE"])
def delete_farm(farm_id: int):
    """Delete a farm profile by id."""
    profiles = get_farm_profiles()
    updated = [p for p in profiles if p.get("id") != farm_id]
    if len(updated) == len(profiles):
        return jsonify({"error": "Farm not found."}), 404
    save_farm_profiles(updated)
    return jsonify({"status": "deleted"})


@app.route("/api/templates", methods=["GET"])
def list_templates():
    """Return available prompt templates."""
    return jsonify({"templates": list(PROMPT_TEMPLATES.keys())})


@app.route("/api/health", methods=["GET"])
def health():
    """Health-check endpoint."""
    return jsonify({
        "status": "ok",
        "model": MODEL_ID,
        "credentials_configured": bool(IBM_API_KEY and IBM_PROJECT_ID),
        "timestamp": datetime.now().isoformat(),
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")
    logger.info("Starting KrishiMitra on port %d (debug=%s)", port, debug)
    app.run(host="0.0.0.0", port=port, debug=debug)
