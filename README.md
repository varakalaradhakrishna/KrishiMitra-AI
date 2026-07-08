# 🌾 KrishiMitra — AI-Powered Farmer Advisory Agent

> Built with **Python Flask** · **IBM Watsonx.ai** · **IBM Granite** models  
> Responsive chat UI with dark mode, multi-farm profiles, crop health dashboard, and safe agronomic guidance.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 Chat Advisor | Conversational AI powered by IBM Granite via Watsonx.ai |
| 🌱 Crop Health Dashboard | Season progress, sowing calendar, pest risk at a glance |
| 🌦️ Soil & Weather Advisory | Soil type guide, monsoon timeline, irrigation comparison |
| 🛡️ Fertiliser / Pesticide Guidance | Safe NPK info, IPM steps, organic inputs — never unverified dosages |
| 🗺️ Multi-Farm Profiles | Add multiple plots; AI tailors every response per farm context |
| ⚙️ AGENT_INSTRUCTIONS | Single file (`agent_config.py`) to customise tone, crop focus, safety rules |
| 🌙 Dark Mode | Auto-persisted, toggleable dark/light theme |
| 📱 Mobile Responsive | Bootstrap 5 + offcanvas sidebar for phones/tablets |
| 🔒 Secure Credentials | IBM API Key loaded from `.env` — never hardcoded |

---

## 📁 Project Structure

```
farmer-advisory-agent/
├── app.py                  # Flask backend + Watsonx.ai integration
├── agent_config.py         # AGENT_INSTRUCTIONS — edit here to customise AI behaviour
├── requirements.txt
├── env.example             # Rename to .env and fill in your credentials
├── templates/
│   └── index.html          # Main UI (Bootstrap 5)
└── static/
    ├── css/
    │   └── style.css       # Custom styles + dark mode
    └── js/
        └── app.js          # Frontend logic (chat, farms, panels)
```

---

## 🚀 Quick Start (Local)

### 1. Prerequisites
- Python 3.10 or 3.11+
- IBM Cloud account with Watsonx.ai enabled
- An IBM Watsonx.ai project with the Granite model enabled

### 2. Clone / unzip and enter the project
```bash
cd farmer-advisory-agent
```

### 3. Create a virtual environment
```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure credentials
```bash
# Copy the example and fill in your values
cp env.example .env
```

Edit `.env`:
```
IBM_API_KEY=your_ibm_cloud_api_key_here
IBM_PROJECT_ID=your_watsonx_project_id_here
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
FLASK_SECRET_KEY=some-random-string-here
WATSONX_MODEL_ID=ibm/granite-13b-chat-v2
```

> **How to get credentials:**
> 1. Log in to [cloud.ibm.com](https://cloud.ibm.com)
> 2. Go to **Manage → Access (IAM) → API keys** and create an API key
> 3. Open [Watsonx.ai](https://dataplatform.cloud.ibm.com/) → your project → **Manage** → copy the **Project ID**
> 4. Note the region URL (e.g., `us-south.ml.cloud.ibm.com`)

### 6. Run the app
```bash
python app.py
```

Open your browser: **http://localhost:5000**

> **No credentials? No problem!**  
> The app runs in **Demo Mode** with realistic mock responses so you can explore the UI immediately.

---

## 🌐 Deployment

### Option A — Gunicorn (Linux/macOS production)
```bash
pip install gunicorn
gunicorn -w 2 -b 0.0.0.0:5000 app:app
```

### Option B — IBM Code Engine (recommended for IBM Cloud)
1. Install [IBM Cloud CLI](https://cloud.ibm.com/docs/cli) and the Code Engine plugin  
2. Build and push the container, or use buildpacks:
```bash
ibmcloud ce app create \
  --name krishimitra \
  --build-source . \
  --strategy buildpacks \
  --env IBM_API_KEY=... \
  --env IBM_PROJECT_ID=... \
  --env FLASK_SECRET_KEY=... \
  --port 5000
```

### Option C — Docker
```dockerfile
# Dockerfile (minimal example)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
```
```bash
docker build -t krishimitra .
docker run -p 5000:5000 --env-file .env krishimitra
```

### Option D — Railway / Render / Fly.io
Set the environment variables in the platform dashboard and deploy from GitHub.  
For Railway: add a `Procfile`:
```
web: gunicorn app:app
```

---

## ⚙️ Customising the AI Agent

All agent behaviour is controlled in **`agent_config.py`**.  
Open the file and edit these sections:

| Section | What to change |
|---------|---------------|
| `AGENT_TONE` | Friendly/formal, regional language style |
| `CROP_SPECIALISATION` | Focus crops, add/remove varieties |
| `REGIONAL_STYLE` | State-specific agro-climatic zones |
| `SAFETY_RULES` | Pesticide/dosage guardrails (**do not weaken**) |
| `REGIONAL_PRACTICES` | Organic methods, monsoon advice, government schemes |
| `AGENT_CAPABILITIES` | Enable/disable specific advisory types |
| `RESPONSE_FORMAT` | Length, markdown structure, closing tips |
| `PROMPT_TEMPLATES` | Pre-built query templates for common requests |

No restart needed for `.env` changes if using `python-dotenv`. For `agent_config.py` changes, restart Flask.

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | Main UI |
| `POST` | `/api/chat` | Send a message, get AI reply |
| `POST` | `/api/conversation/clear` | Clear session conversation |
| `GET`  | `/api/farms` | List all farm profiles |
| `POST` | `/api/farms` | Add a new farm profile |
| `DELETE` | `/api/farms/<id>` | Delete a farm profile |
| `GET`  | `/api/templates` | List available prompt templates |
| `GET`  | `/api/health` | Health check + credential status |

### Example: POST /api/chat
```json
{
  "message": "What should I do about yellowing rice leaves?",
}
```
**Response:**
```json
{
  "reply": "**Possible causes for yellowing rice leaves...**",
  "timestamp": "14:35"
}
```

---

## 🛡️ Safety & Responsible AI

KrishiMitra follows strict safety rules (defined in `agent_config.py → SAFETY_RULES`):
- ❌ Never provides specific pesticide dosage values
- ✅ Always recommends label dose + PPE
- ❌ Never guarantees yield numbers
- ✅ Qualifies fertiliser advice with "get a Soil Health Card"
- ✅ Directs poisoning emergencies to **1800-180-1551** (toll-free)
- ✅ Mentions government schemes for awareness only, not specific amounts

---

## 📋 Requirements

```
flask>=3.0.0
flask-cors>=4.0.0
python-dotenv>=1.0.0
ibm-watsonx-ai>=0.2.6
requests>=2.31.0
gunicorn>=21.2.0
```

---

## 📜 License

MIT — free to use, modify, and distribute.

---

*Made with IBM Watsonx.ai · IBM Granite · Python Flask*
