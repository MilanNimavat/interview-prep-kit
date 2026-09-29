# The AI Interview Prep Kit 

Welcome to **The AI Interview Prep Kit**! This project is a robust, full-stack application designed to automatically generate personalized interview preparation materials based on a job description and a company website.

This project functions both as a standalone batch evaluation CLI and as a rich, interactive web application.

---

## 🏗️ Project Overview & Stack Justification

The project is structured as a **Split Monorepo (npm workspaces)** containing two primary packages:
- `backend`: The API and CLI generation engine.
- `frontend`: The user-facing web application.

### Tech Stack

- **Backend:** Node.js, Express, TypeScript
  - *Justification:* Express provides a lightweight, robust framework for building RESTful APIs. TypeScript ensures type safety across the complex data schemas (using Zod for validation).
- **Frontend:** Next.js 14+ (App Router), React, Tailwind CSS, TypeScript
  - *Justification:* Next.js App Router offers excellent performance and developer experience. Tailwind CSS allows for rapid, consistent styling of a professional UI without massive CSS bundles.
- **LLM Provider:** Groq (`llama-3.3-70b-versatile` with `llama-3.1-8b-instant` fallback)
  - *Justification:* Groq offers blazing-fast inference speeds, which is crucial for complex, multi-step generation pipelines that require structured JSON outputs.
- **Database:** MongoDB (Mongoose) with **Seamless In-Memory Fallback**
  - *Justification:* MongoDB is ideal for storing the deeply nested JSON documents of the Kits. The custom in-memory fallback ensures the application and CLI can run instantly on any machine *without* requiring the evaluator to configure a local MongoDB instance.

---

## 🚀 Local Setup & Testing

### Prerequisites
- Node.js (v18+)
- (Optional) MongoDB running locally or a MongoDB Atlas URI.

### 1. Installation
Clone the repository and install dependencies from the root:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the `backend` directory (or copy `.env.example` if available):
```env
# backend/.env
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
# Optional: If omitted, the backend uses its robust In-Memory Database fallback!
MONGODB_URI=mongodb://127.0.0.1:27017/apex-ai-prep
```

### 3. Running the Batch CLI Evaluator
The CLI strictly conforms to the assessment's batch processing requirements. It reads an array of test cases (JD + URL) and outputs fully generated Kits.

Run the following command from the **root directory**:
```bash
npm run evaluate -- --input test_cases.json --output kits.json
```
*(A sample `test_cases.json` is provided in the `backend` directory. The command resolves paths correctly whether you are in the root or `backend` folder).*

### 4. Running the Full Stack Application
To start both the frontend and backend concurrently for local development:
```bash
npm run dev
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:5000](http://localhost:5000)

---

## 🧠 Core Architecture & Algorithms

### 1. Research Crawler & Heuristic Link Ranking
When a company URL is provided, the backend initiates a custom web crawler.
- **Fetching:** Uses `axios` and `cheerio` to fetch the HTML. It handles common failure modes (404s, timeouts) gracefully.
- **Heuristic Discovery:** Instead of randomly crawling links, the crawler parses all `<a href>` tags on the homepage and scores them based on heuristic keywords (e.g., `about`, `careers`, `engineering`, `culture`). It then fetches the top-scoring pages to build a comprehensive contextual profile of the company.

### 2. The Generation Sequencing & Two-Pass Coverage Loop
To ensure high-quality, comprehensive output that explicitly maps to the job description, the LLM pipeline executes in stages:
1.  **Extraction & Briefing:** The Job Description and Crawled HTML are analyzed to extract strict technical requirements, cultural values, and domain concepts.
2.  **Category Generation:** Core question categories are formulated based on the extracted brief.
3.  **Question & Flashcard Generation:** Questions are generated for each category, alongside a deck of conceptual flashcards.
4.  **Two-Pass Coverage Verification:** 
    - *Pass 1:* The system maps every generated question back to the initial requirements.
    - *Pass 2:* Any requirements identified as "uncovered" are fed *back* into the LLM in a focused prompt to generate missing questions, ensuring 100% alignment with the JD.

### 3. Deterministic Arithmetic Schedule Allocation
The day-by-day study schedule allocation is **100% deterministic arithmetic code**. 
- It *does not* use the LLM to assign days. 
- The algorithm calculates the total number of available days provided by the user.
- It distributes study modules (categories and flashcards) uniformly across the timeline.
- It automatically inserts a "Review & Mock Interview" day every 7 days (or appropriately spaced based on the total timeline) and guarantees a final review on the last day.

---

## 🔄 State Machine & Granular Regeneration

A critical requirement was allowing users to edit generated content without losing their work if they requested an AI regeneration.

**The `user_state` Enum (`generated`, `edited`, `pinned`):**
- Every editable item (question, flashcard) tracks its state. Defaults to `generated`.
- Manual edits in the UI change the state to `edited`.
- Users can explicitly mark an item as `pinned` to protect it.

**Regeneration Logic:**
When a user requests regeneration for a specific category via `POST /api/kits/:id/regenerate-section`:
1. The backend filters the category's current questions, separating `generated` from `edited`/`pinned`.
2. It discards the `generated` questions.
3. It prompts the LLM to generate *new* questions, explicitly feeding it the `edited`/`pinned` questions as context so the LLM doesn't create duplicates.
4. The newly generated questions and the preserved `edited`/`pinned` questions are merged.
5. The deterministic schedule and coverage metrics are automatically re-calculated.

---

## 💡 Creative Feature: AI Mock Interview Evaluator (Feature B)

To elevate the standard prep kit, I implemented **Feature B: The AI Mock Interview Answer Evaluator**.

**How it works:**
- Inside the "Kit Builder" UI, users can launch an interactive Mock Interview Simulator for any specific question.
- The user records their answer (via typing).
- The system sends the answer, the original question, and the expected criteria to a specialized LLM endpoint (`POST /api/kits/:id/practice`).
- The LLM acts as a strict technical interviewer and returns a structured evaluation containing:
  - A numerical score (0-100).
  - Specific feedback on what was good.
  - Constructive feedback on what was missing (technical inaccuracies, better approaches).
  - An improved, model answer.
- This creates an active learning loop, moving beyond static reading material.

---

## 🛡️ Edge Case Analysis & Resilience

The system was designed to be highly fault-tolerant:

- **2-line stub Job Descriptions:** The LLM pipeline detects extremely short or generic JDs. It relies heavier on the company website context and standard software engineering baselines to flesh out a complete prep kit, rather than failing.
- **404/Offline Company Sites:** If the crawler hits a 404, times out, or encounters a site that blocks scraping (e.g., aggressive WAF), it catches the error, logs a warning, and gracefully falls back to generating the kit based *solely* on the Job Description. The application never crashes.
- **LLM Rate-Limit Backoff:** The `llm.ts` service wraps the Groq SDK with an exponential backoff and jitter strategy. If a `429 Too Many Requests` or `503 Service Unavailable` error occurs (common with free/tier-1 LLM APIs), the system automatically waits and retries up to 4 times before failing.
- **JSON Parsing Failures:** The LLM is forced into `json_object` mode. However, the system also employs a robust string-cleaning utility to strip markdown backticks (` ```json `) or preamble text before passing it to strict Zod schema validation.
- **Missing Database Connectivity:** As mentioned, if MongoDB isn't running, the app seamlessly defaults to in-memory maps. It won't throw startup errors, ensuring a smooth evaluation experience.
