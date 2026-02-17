# Project Specification: Serverless Adaptive Learning Engine (Project "Sprout")

**Role:** Principal Architect
**Objective:** Build a serverless, event-driven system that aggregates unstructured daily feedback logs to generate personalized, development-focused weekly plans using LLMs.

---

## 1. High-Level Architecture

The system follows a **"Split-Brain" Architecture** to decouple user interaction from heavy compute tasks.

### The Diagram

```mermaid
graph TD
    User((You)) -->|1. Type Natural Text| UI[Next.js Dashboard 'Smart Input']
    UI -->|2. Extract JSON Data| AI_Front[OpenRouter API]
    UI -->|3. Store Structured Data| DDB[(AWS DynamoDB)]
    
    Scheduler[EventBridge Scheduler] -->|4. Trigger (Sunday 8AM)| Lambda[AWS Lambda Python]
    
    Lambda -->|5. Fetch Logs & Profile| DDB
    Lambda -->|6. Fetch Research| S3[(S3 Knowledge Base)]
    Lambda -->|7. Synthesize Weekly Plan| AI_Back[OpenRouter API]
    Lambda -->|8. Deliver Plan| SES[Amazon SES]
    SES -->|9. Email Notification| User

```

## 2. Data Design (Single Table Strategy)

We will use **AWS DynamoDB** with a flexible Single Table Design (STD).

**Table Name:** `Sprout_Data`
**Capacity:** On-Demand (Free Tier optimized)

| Entity | Partition Key (PK) | Sort Key (SK) | Attributes (JSON extracted via LLM) |
| --- | --- | --- | --- |
| **Child Profile** | `USER#Yumi` | `PROFILE` | `birth_date` (String, `YYYY-MM-DD`), `milestones` (List), `schemas` (List), `interests` (List) |
| **Daily Log** | `LOG#Yumi` | `DATE#2026-02-12` | `raw_text` (String), `key_takeaways` (List), `sentiment` (String) |
| **Weekly Plan** | `PLAN#Yumi` | `WEEK#2026-02-16` | `overview` (Map), `weeklyGoals` (List), `activityMenu` (Map) |

**S3 Storage Strategy**

* **Bucket:** `sprout-knowledge-base`
* **Structure:**
  * `/development_guides` (reference markdown files, including `baby-development-report.md`)
  * `/plans` (generated weekly plan markdown files, for example `plans/Yumi/2026-02-16.md`)

**Profile Age Strategy**

* Persist `birth_date` as the source of truth in DynamoDB.
* Derive `ageMonths` at read-time in the backend/frontend so age stays current automatically.

---

## 3. Interface & UX Specification (Next.js)

The frontend acts as the "Control Plane" and relies on AI for frictionless data entry.

### Core Features

1. **The "Smart Input" (LLM Structured Extraction):**
* **UX:** A single text box where the user brain-dumps the day's events (e.g., "Yumi loved the sensory bin today but got mad during tummy time").
* **Backend:** Next.js API route (`/api/logs`) sends this raw text to OpenRouter. The LLM is strictly prompted to return a JSON object categorizing the input into "Daily Log" data and identifying any new "Profile Updates" (milestones hit).
* **Storage:** Saves the clean JSON directly to DynamoDB.

2. **The Profile State:** View of the child's current milestones and schemas, fetched from DynamoDB.
3. **The Play Plan:** A component-driven UI that fetches the most recent weekly plan (strict JSON payload) from DynamoDB and maps the data into interactive UI cards (e.g., Activity Menus, Goals).

### Security Strategy (The Bouncer & Display Case)

To protect personal data while allowing recruiter access, we use **Next.js Middleware**.

* **The Bouncer (Admin Access):** User enters a passcode matching the `ADMIN_PASSCODE` env var through `/api/auth/login`. On success, the server issues a signed `sprout_session` HttpOnly cookie that enables real AWS-backed reads/writes.
* **The Display Case (Demo Mode):** Default visitors receive a `sprout_demo=true` HttpOnly cookie and stay in demo mode. API routes serve mock-style behavior and block database writes.
* **Defense in Depth:** Middleware resolves mode at the edge, and each API route re-checks mode before read/write execution (`authenticated`, `demo`, `unauthenticated`).

---

## 4. The Intelligence Engine (AWS Lambda)

This is the "Worker" that runs once a week. It is completely isolated from the frontend.

### Logic Flow

1. **Wake Up:** Triggered by EventBridge Scheduler.
2. **Context Assembly:**
* Query DynamoDB for `USER#Yumi` (Current Profile).
* Query DynamoDB for `LOG#Yumi` where date is > (Today - 7 days).
3. **Fetch Research:**
* Pull relevant developmental stage guidelines from S3 Knowledge Base.
4. **Prompt Engineering:**
* Constructs a rigid system prompt: *"You are an expert development guide. Based on these specific logs and this child's profile, generate a 5-day plan in strictly typed JSON matching our schema."*
5. **Inference & Storage:**
* Sends payload to **OpenRouter** (using Gemini 3 Pro for deep context/reasoning).
* Receives structured JSON response and performs a `PutItem` to DynamoDB (`PK=PLAN#Yumi`, `SK=WEEK#YYYY-MM-DD`) so the frontend can render it.
6. **Delivery:**
* Parses the JSON into an HTML email template using Python.
* Uses **Amazon SES** to email the formatted HTML plan to the parent.


---

## 5. Security & Infrastructure

### IAM Roles (Least Privilege)

1. **Next.js App Role (Amplify):**
* Allow `PutItem/GetItem/UpdateItem` on `Sprout_Data`.
* Allow `UpdateSchedule` on EventBridge.


2. **Lambda Worker Role:**
* Allow `Query` on `Sprout_Data` (Read-Only).
* Allow `GetObject` on S3 Knowledge Base.
* Allow `SendEmail` on SES.



### Environment Variables

* **Next.js:** `DATA_MODE`, `AWS_REGION`, `DYNAMODB_TABLE`, `S3_WEEKLY_PLAN_BUCKET`, `S3_WEEKLY_PLAN_PREFIX`, `ADMIN_PASSCODE`, `SESSION_SECRET`, `SESSION_TTL_HOURS`, `SESSION_REMEMBER_TTL_DAYS`, `OPENROUTER_API_KEY`.
* **Lambda:** `OPENROUTER_API_KEY` (for weekly plan generation), `DYNAMODB_TABLE`, `S3_BUCKET`, `S3_DEVELOPMENT_GUIDES_PREFIX`, `S3_WEEKLY_PLANS_PREFIX`, `EMAIL_SOURCE`.

---

## 6. Execution Roadmap (Data First Strategy)

### Phase 1: The Data Foundation (Day 1)

* [x] Create DynamoDB Table (`Sprout_Data`) in AWS Console.

### Phase 2: The Interface & Extraction (Day 2-3)

* [ ] Initialize Next.js app and deploy to AWS Amplify Gen 2.
* [ ] Build the "Smart Input" UI component.
* [ ] Write `/api/logs` route to call OpenRouter for JSON extraction.
* [ ] Connect `/api/logs` to DynamoDB and verify data writes successfully.

### Phase 3: Authentication & Portfolio Polish (Day 4)

* [ ] Implement Next.js Middleware for the `ADMIN_PASSCODE`.
* [ ] Implement "Demo Mode" fallback for public portfolio viewers.

### Phase 4: The Brain (Day 5-6)

* [ ] Write Python Lambda script to fetch 7 days of logs from DynamoDB.
* [ ] Connect Lambda to OpenRouter to synthesize the weekly plan.
* [ ] Set up Amazon SES and test email delivery.

### Phase 5: Automation (Day 7)

* [ ] Configure EventBridge Scheduler to trigger the Lambda every Sunday.

---

## 7. Portfolio Narrative (Resume Value)

**Project Title:** Serverless Adaptive Learning Engine (Sprout)
**One-Liner:** "An event-driven RAG system that orchestrates personalized development curriculums using AWS Lambda, DynamoDB, and LLMs."

**Key Talking Points:**

* **Architecture:** Decoupled the high-latency AI processing (Lambda) from the user-facing application (Next.js) using EventBridge.
* **Single Table Design (NoSQL):** Designed a highly efficient DynamoDB schema utilizing PK/SK patterns to store user profiles, daily logs, and complex nested JSON weekly plans in a single table, optimizing for lightning-fast frontend retrieval.
* **Strict Structured Output:** Engineered a reliable data pipeline using LLM deep-thinking capabilities to transform unstructured developmental research and daily logs into strictly typed JSON schemas for predictable, component-based UI rendering.
* **Smart Extraction:** Replaced traditional form inputs with an LLM-powered extraction layer, converting unstructured user text into strict JSON for NoSQL storage.
* **Edge Security:** Implemented Next.js Edge Middleware to protect PII via passcode authentication while maintaining a stateless "Demo Mode" for public portfolio showcasing.
* **Cost Optimization:** Architected to run entirely within the AWS Free Tier using Lambda Layers and On-Demand DynamoDB Capacity.