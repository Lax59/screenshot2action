# Screenshot2Action ↗

> **Turn forgotten screenshots into actions.**  
> Built for the AWS Bharat Builds Tour 2026 · First Commit Hackathon

[![Live Demo](https://img.shields.io/badge/Live-Amplify-orange?logo=amazonaws)](https://your-amplify-url.amplifyapp.com)
[![Backend](https://img.shields.io/badge/API-Lambda%20%2B%20Bedrock-yellow?logo=amazonaws)](https://your-api-url)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 🎯 The Problem

Indian university students save hundreds of screenshots every semester — WhatsApp assignment reminders, fee payment notices, event flyers, exam timetables. These screenshots pile up in their gallery and get **forgotten**.

There's no automatic way to turn a saved screenshot into a structured action.

## 💡 The Solution

**Screenshot2Action** uses **Amazon Bedrock's multimodal vision** to read any screenshot and extract:

- 📚 Education deadlines (assignments, exams)
- 🎯 Events & appointments (workshops, meetups)  
- 💳 Payment reminders (fees, invoices)

Each extracted action comes with confidence scoring, evidence from the image, and **one-click calendar/UPI integrations** — so you always know what to do next.

---

## 🏗 AWS Architecture

```
Browser (React + Vite)
  └── AWS Amplify Hosting (CDN)
        │
        ▼
API Gateway (HTTP API)
  └── Lambda Function (Python 3.13, arm64/Graviton2)
        │   ├── FastAPI via Mangum
        │   ├── Amazon Bedrock (amazon.nova-lite-v1:0) ← Vision AI
        │   ├── Amazon S3 (private screenshot storage, 30-day expiry)
        │   └── Amazon DynamoDB (PAY_PER_REQUEST, action storage)
```

### Services Used
| AWS Service | Purpose |
|---|---|
| **Amazon Bedrock** (Nova Lite v1) | Multimodal vision — reads screenshots, returns structured JSON |
| **AWS Lambda** (Python 3.13, arm64) | Serverless compute — no idle costs |
| **Amazon API Gateway** (HTTP API) | REST interface with CORS |
| **Amazon S3** | Private screenshot storage with AES-256 encryption + 30-day lifecycle expiry |
| **Amazon DynamoDB** | Serverless action storage (PAY_PER_REQUEST, PITR enabled) |
| **AWS Amplify** | Frontend hosting with CI/CD from GitHub |
| **AWS SAM** | Infrastructure as Code — one-command deploy |

---

## 🚀 Quick Start (Local Demo — no AWS account needed)

```bash
# 1. Frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

The demo works fully without any backend. Click **"Try a demo screenshot"** to see the extraction flow.

---

## 🔗 Connecting the Real Backend (with Amazon Bedrock)

### Prerequisites
- AWS account with Amazon Bedrock access
- Enable a vision model in **Bedrock → Model access** (recommended: `amazon.nova-lite-v1:0`)
- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed

### 1. Deploy backend to AWS

```bash
# Install SAM CLI (if not already)
brew install aws-sam-cli

# Build and deploy
sam build
sam deploy --guided
```

During guided setup:
- Stack name: `screenshot2action`
- Region: `ap-south-1` (or where your Bedrock model is enabled)
- `BedrockModelId`: `amazon.nova-lite-v1:0`
- `CorsOrigin`: `http://localhost:5173` (update after Amplify deploy)

Copy the `ApiUrl` from the Outputs.

### 2. Connect frontend to backend

```bash
cp .env.example .env
# Edit .env and set:
# VITE_API_URL=https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod
```

Restart `npm run dev`. The mode badge will switch to **"AWS Bedrock Live"**.

### 3. Deploy frontend to AWS Amplify

1. Push this repo to a **public GitHub repository**
2. AWS Console → Amplify → **New app → Host web app** → connect your repo
3. Add environment variable: `VITE_API_URL` = your ApiUrl from step 1
4. Build command: `npm run build` · Output directory: `dist`
5. Deploy! Copy the Amplify URL.
6. Run `sam deploy` again with `CorsOrigin` set to your Amplify URL.

---

## ✨ Key Features

### 🧠 AI-Powered Extraction
- Amazon Bedrock reads the full image — no OCR preprocessing needed
- Returns structured JSON: category, title, description, date, time, priority, confidence, evidence
- Confidence scoring tells you how certain the AI is
- `needs_review` flag surfaces ambiguous extractions

### 📅 Real Calendar Integration
- **Download .ICS** — opens in Apple Calendar, Google Calendar, Outlook
- **Google Calendar** deep-link — pre-fills title, date, location
- 30-minute reminder alarm included in every ICS

### 💳 UPI Pay Integration
- For payment screenshots: extracts amount and UPI ID
- One tap to open any UPI app (Google Pay, PhonePe, Paytm)

### 🔒 Privacy First
- Screenshots stored privately in S3 (never public)
- Auto-deleted after 30 days (S3 lifecycle rule)
- Lambda never sends raw screenshot data to the browser
- No API keys in the frontend — IAM roles only

### 🎨 Dark Mode UI
- Glassmorphism design with animated gradient orbs
- Confidence bars, priority badges, review warnings
- Responsive — works on mobile

---

## 🛡 Security

- S3 bucket: fully private with `PublicAccessBlockConfiguration`
- Lambda IAM: least-privilege (S3 prefix only, one DynamoDB table, Bedrock InvokeModel only)
- No credentials in frontend — Bedrock invoked via IAM role attached to Lambda
- Input validation: file type (MIME + extension), file size (8 MB limit)
- CORS: explicit origin allowlist, not `*`

---

## 📁 Project Structure

```
screenshot2action/
├── src/
│   ├── main.jsx         # React app (single file, no router needed)
│   └── styles.css       # Dark-mode CSS (glassmorphism + responsive)
├── backend/
│   ├── main.py          # FastAPI app (Bedrock + DynamoDB + heuristic fallback)
│   └── requirements.txt # Python deps (fastapi, mangum, boto3)
├── template.yaml        # AWS SAM IaC (Lambda + API GW + S3 + DynamoDB)
├── index.html           # Vite entry
├── package.json         # Frontend deps
└── .env.example         # Environment variable template
```

---

## 🏆 Hackathon Submission Checklist

- [x] New public GitHub repository
- [x] AWS services used: Bedrock, Lambda, API Gateway, S3, DynamoDB, Amplify
- [x] Real problem for Indian students
- [x] Fully serverless — scales to zero, no idle costs
- [ ] Public/unlisted YouTube demo (< 3 minutes)
- [ ] AWS Builder Center profile linked

---

## 🎬 3-Minute Demo Script

| Time | Action |
|------|--------|
| 0:00 | Show the landing page. State the problem ("How many screenshots do you have that you've forgotten?") |
| 0:25 | Click "Try a demo screenshot" → select DBMS Assignment → click Analyze |
| 0:40 | Show the result card: confidence bar, evidence quote, "Needs Review" flag |
| 1:00 | Click "Download .ICS" → show it opening in Calendar |
| 1:20 | Save the action. Show it appear in the Action Inbox with filters |
| 1:40 | Try a payment demo — show the UPI Pay button |
| 2:00 | Show the AWS Architecture section in the app |
| 2:20 | Switch to AWS Console → show Lambda, Bedrock, DynamoDB, S3 |
| 2:50 | Show the Amplify-hosted URL (live, on the internet) |
| 3:00 | End. "Screenshot2Action — turn saved moments into momentum." |

---

## 🛠 Built With

- **Amazon Bedrock** (Nova Lite v1) — multimodal vision AI
- **AWS SAM** — infrastructure as code
- **FastAPI** + **Mangum** — Python serverless API
- **React** + **Vite** — fast frontend build
- **AWS Amplify** — frontend hosting + CI/CD
- **AI Coding Tools**: Google Antigravity (Gemini) for code generation and architecture

---

## 📄 License

MIT — free to use, fork, and build on.
