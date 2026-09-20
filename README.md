# Screenshot2Action ↗

> **Turn forgotten screenshots into organized actions, tracked opportunities, and calendar events.**  
> Built with Amazon Bedrock (Nova Lite), AWS Lambda, Amazon S3, and Amazon DynamoDB.

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb?logo=react)](https://github.com/Lax59/screenshot2action)
[![AI Engine](https://img.shields.io/badge/AI-Amazon%20Bedrock%20Nova%20Lite-FF9900?logo=amazonaws)](https://aws.amazon.com/bedrock/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Mangum-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Storage](https://img.shields.io/badge/Database-Amazon%20DynamoDB-4053D6?logo=amazondynamodb)](https://aws.amazon.com/dynamodb/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 The Problem

Students and developers save hundreds of screenshots every month:
- WhatsApp assignment deadlines and exam circulars
- LinkedIn / Twitter internship listings and hiring notices
- Hackathon posters with prize pools, registration dates, and team guidelines
- Semester tuition fee receipts and payment challans

These screenshots get buried in photo galleries. Critical submission deadlines pass, job openings close, and late payment fines accumulate because there is no automated bridge between image captures and structured task execution.

---

## 💡 The Solution

**Screenshot2Action** is a fullstack serverless application that analyzes image uploads using **Amazon Bedrock Nova Lite (`amazon.nova-lite-v1:0`)**, instantly extracting actionable data:

1. **Academic Deadlines** — Title, submission cutoff date, course, priority, and extracted evidence quote.
2. **Opportunities & Hackathons** — Program name, company, role track, stipend/prize pool, application portal URL, and deadline.
3. **Payments & Fees** — Due amount in ₹ INR, target UPI ID (`upi://pay`), and warning flags.
4. **Calendar & Pipeline Integration** — One-click `.ICS` file download (Apple Calendar / Outlook), Google Calendar deep link, and an interactive Kanban application status pipeline.

---

## 🏗 System Architecture

```
User Browser (React + Vite)
    │
    ├─► Amazon S3 (Screenshot storage, AES-256 server-side encryption, 30-day lifecycle expiration)
    │
    ├─► Amazon API Gateway (HTTP API with CORS)
    │     │
    │     ▼
    │   AWS Lambda (Python 3.13, Graviton2 arm64)
    │     │   ├── FastAPI via Mangum ASGI adapter
    │     │   └── boto3 client
    │     │
    │     ├─► Amazon Bedrock (Nova Lite: amazon.nova-lite-v1:0)
    │     │     Multimodal foundation vision model
    │     │
    │     └─► Amazon DynamoDB (PAY_PER_REQUEST, actions table)
    │           Action CRUD, application pipeline states, TTL
```

### AWS Services Breakdown
| AWS Service | Role | Configuration |
|---|---|---|
| **Amazon Bedrock** | Multimodal Vision AI | Model ID: `amazon.nova-lite-v1:0` with JSON schema prompt |
| **AWS Lambda** | Serverless Backend Compute | Python 3.13 on `arm64` (Graviton2) with Mangum ASGI handler |
| **Amazon API Gateway** | Managed HTTP API | CORS-enabled, low-latency REST routing |
| **Amazon S3** | Secure Image Storage | `PublicAccessBlockConfiguration: true`, AES-256 SSE, 30-day TTL |
| **Amazon DynamoDB** | NoSQL Data Store | `BillingMode: PAY_PER_REQUEST`, Point-in-Time Recovery enabled |
| **AWS SAM** | Infrastructure as Code | Complete single-command deployment via `template.yaml` |

---

## ✨ Key Features

- **✦ Amazon Bedrock Multimodal Vision**: Sends image bytes directly to Bedrock Nova Lite to return strictly typed JSON with zero external OCR dependencies.
- **⚡ Real Measured AWS Timings**: Visual timeline widget displays actual round-trip milliseconds for S3 upload, Bedrock inference, and total pipeline execution.
- **💼 Opportunities Tracker (Kanban Pipeline)**: Track internship and hackathon applications through 5 stages: *Not Applied*, *Applied*, *Interviewing*, *Offer Received*, and *Rejected*.
- **✨ Universal Manual Entry Form**: Easily add opportunities or academic tasks manually without needing a screenshot file.
- **📅 Calendar Deep-Links & .ICS**: Download standardized `.ics` calendar events with built-in 30-minute reminder alarms or pre-fill Google Calendar.
- **💳 Instant UPI Pay Integration**: Parses UPI IDs and bill amounts to launch Google Pay, PhonePe, or Paytm via `upi://pay` links.
- **🌓 Theme & Color Accents**: Includes responsive Day/Night modes and 5 accent palettes (Violet, Cyan, Emerald, Amber, Rose).
- **🔔 Notification Bell**: In-app deadline alerts highlight upcoming or overdue items.

---

## 📁 Repository Structure

```
screenshot2action/
├── src/
│   ├── main.jsx          # React 18 single-page application (Dashboard, Kanban, Upload)
│   └── styles.css        # Responsive stylesheet (Day/Night themes, cards, modals)
├── backend/
│   ├── main.py           # FastAPI backend (Bedrock client, S3/DynamoDB CRUD, fallback parser)
│   ├── actions_store.json # Persistent JSON data store for local development
│   └── requirements.txt  # Python dependencies (fastapi, uvicorn, boto3, mangum)
├── template.yaml         # AWS SAM CloudFormation template (Lambda, S3, DynamoDB, HTTP API)
├── Dockerfile            # Container deployment manifest for backend
├── Procfile              # PaaS process file (Render / Heroku)
├── render.yaml           # One-click Render.com deployment blueprint
├── netlify.toml          # Netlify build configuration
├── index.html            # Vite HTML entrypoint
└── package.json          # Node.js dependencies (React, Vite)
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** v18+ and **npm**
- **Python** 3.11+ (Python 3.13 recommended)

### 2. Frontend Setup
```bash
# Clone the repository
git clone https://github.com/Lax59/screenshot2action.git
cd screenshot2action

# Install frontend dependencies and start Vite dev server
npm install
npm run dev
```
The frontend is available at `http://localhost:5173`.

### 3. Backend Setup
```bash
# In the project root directory
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# Start the FastAPI server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The API is available at `http://localhost:8000`. Test health at `http://localhost:8000/api/health`.

---

## ☁️ Deployment

### Option A: AWS Serverless (SAM CLI)
If deploying directly to your AWS account:

1. **Ensure AWS CLI is configured:**
   ```bash
   aws configure
   # Enter AWS Access Key ID, Secret Access Key, Region (ap-south-1), and json
   ```
2. **Enable Bedrock Model Access:**
   In the AWS Console, open **Amazon Bedrock** → **Model access** → Request access to **Amazon Nova Lite** (`amazon.nova-lite-v1:0`).
3. **Build and Deploy:**
   ```bash
   sam build
   sam deploy --guided
   ```
   - Stack name: `screenshot2action-prod`
   - Region: `ap-south-1` (or your preferred region)
   - Confirm IAM role creation: `y`
4. Copy the output `ApiUrl` and configure it in your frontend environment variable:
   ```bash
   VITE_API_URL=https://<api-id>.execute-api.ap-south-1.amazonaws.com/prod
   ```

### Option B: Cloud Hosting (Netlify Frontend + Render Backend)
1. **Frontend on Netlify:**
   - Connect repository `Lax59/screenshot2action` to Netlify.
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Set environment variable `VITE_API_URL` to your backend API URL.
2. **Backend on Render / Container:**
   - Use the included `Dockerfile` or `render.yaml`.
   - Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

---

## 🧪 Testing the API

Run the comprehensive test suite to verify health, actions CRUD, and demo screenshot analysis:

```bash
python3 - << 'EOF'
import urllib.request, json

base = "http://127.0.0.1:8000"

# 1. Health check
with urllib.request.urlopen(f"{base}/api/health") as r:
    print("Health:", json.loads(r.read()))

# 2. Get actions
with urllib.request.urlopen(f"{base}/api/actions") as r:
    actions = json.loads(r.read())
    print(f"Loaded {len(actions)} actions successfully.")
EOF
```

---

## 🎬 3-Minute Hackathon Demo Script

| Time | Screen | Talking Points |
|---|---|---|
| **0:00 - 0:35** | Home Page | Introduce Screenshot2Action: "Students capture dozens of screenshots for assignments, internship postings, and hackathons, but they get lost. Screenshot2Action turns them into structured actions automatically." Highlight the **AWS Architecture section** (S3, Bedrock Nova Lite, Lambda, DynamoDB). |
| **0:35 - 1:20** | Action Inbox | Click **"Try a demo screenshot"** → pick **"Assignment Deadline"** → click **"Analyze screenshot"**. Show the instant extraction results, the **AWS Pipeline timeline widget** showing real response times, and click **"Save to My Actions"**. |
| **1:20 - 2:05** | Opportunities Kanban | Switch to **💼 Opportunities**. Showcase the Kanban pipeline tracking applications from *Not Applied* to *Offer Received*. Click **"+ Add Opportunity"** to demonstrate manual entry of a custom hackathon or internship. Update an application status pill. |
| **2:05 - 2:40** | Features & Integrations | Demonstrate **.ICS download** / **Google Calendar integration**. Click the **💳 Pay** button on the fee notice. Toggle between **Day and Night theme** and switch accent colors. Show deadline alerts in the **Notification Bell**. |
| **2:40 - 3:00** | Conclusion | Summarize the serverless AWS stack: zero idle costs, private S3 storage with 30-day lifecycle cleanup, Amazon Bedrock foundation intelligence, and sub-second DynamoDB lookups. |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
