# From local demo to AWS deployment

There is no shared API key to request from me. In production, AWS authorizes the backend through an **IAM role**. The browser never receives AWS credentials or a Bedrock key.

## 1. See the project now

The local UI is already running at **http://127.0.0.1:5173/**. Keep the terminal that runs `npm run dev` open. If it stops, open a terminal in this folder and run:

```bash
npm run dev
```

For the real local analysis API, use a second terminal after configuring AWS credentials and Bedrock model access:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
MOCK_AI=false AWS_REGION=ap-south-1 BEDROCK_MODEL_ID=YOUR_MODEL_ID uvicorn backend.main:app --reload --port 8000
```

## 2. Create and configure your AWS account

1. Create/sign in to an AWS account. Do **not** create an API key for the frontend.
2. Install and sign in to the AWS CLI: `aws configure`. This asks for credentials locally and stores them only on your machine; never put them in `.env` or Git.
3. In **Amazon Bedrock → Model access**, enable one vision-capable model available in your region (for example an Amazon Nova model). Copy its model ID.
4. Install AWS SAM CLI, then run these from the project root:

```bash
sam build
sam deploy --guided
```

During the guided questions:

- Stack name: `screenshot2action`
- Region: `ap-south-1` (or a region where your chosen Bedrock model is available)
- `BedrockModelId`: paste the model ID from Bedrock
- `CorsOrigin`: temporarily use `http://localhost:5173`

SAM creates a private S3 bucket, DynamoDB table, API Gateway endpoint, and Lambda with only S3/DynamoDB/Bedrock permissions. Copy the `ApiUrl` output. Until this is done, the only intentionally simulated input is the **Try a demo screenshot** button.

## 3. Connect the deployed API

Create a local `.env` file (this is ignored by Git):

```bash
VITE_API_URL=https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com
```

Restart `npm run dev`. The badge will still say “Local mock mode” until we add a public configuration endpoint; the backend health endpoint at `YOUR_API_URL/api/health` confirms `"mode":"aws"`.

## 4. Deploy the frontend

The simplest route is **AWS Amplify Hosting**:

1. Push this folder to a new public GitHub repository.
2. AWS Console → Amplify → New app → Host web app → choose the repo.
3. Add environment variable `VITE_API_URL` with your `ApiUrl`.
4. Build command: `npm run build`; output directory: `dist`.
5. Deploy. Copy the Amplify URL and update the SAM `CorsOrigin` to it, then run `sam deploy` again.

## Required demo proof

In your video, show the deployed Amplify URL, analyze an image, and briefly show the AWS console resources (API Gateway/Lambda/Bedrock/S3/DynamoDB). That satisfies the requirement that AWS is actually used, not merely named.
