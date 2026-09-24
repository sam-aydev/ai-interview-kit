# The AI Interview Prep Kit

An intelligent, full-stack application that transforms a job description and a company URL into a bespoke, editable, and trackable interview preparation kit.

## 🧠 Project Overview & Tech Stack

This project was built adhering strictly to the assessment brief, emphasizing a robust separation between LLM generation tasks, deterministic business logic, and strict schema validation.

**Stack:**

- **Frontend:** Next.js (React), Tailwind CSS v4, Framer Motion, Lucide React
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB Atlas
- **LLM Provider:** Groq (Model: `llama3-8b-8192`)
- **Scraping / Crawling:** Custom heuristic crawler using `cheerio` and `robots-parser`
- **Testing:** Vitest (for deterministic logic and structural validation)

**Justification:**
Groq was chosen for the LLM provider because its free tier offers incredible speed (LPU inference), which minimizes the risk of network timeouts during the multi-step generation pipeline. Tailwind v4 provides a CSS-first, zero-config styling approach that keeps the Next.js frontend extremely lean.

---

## ⚙️ Setup Instructions

### Deployed Environment

The application is deployed and ready to use. No setup is required for the live version:

- **Frontend (Live URL):** [Insert Vercel URL Here]
- **Backend API Base:** [Insert Render URL Here]

### Local Development Setup

**1. Environment Variables**
Create a `.env` file in the root directory:

```env
LLM_API_KEY=your_groq_api_key_here
LLM_BASE_URL=https://api.groq.com/openai/v1/chat/completions
MONGODB_URI=mongodb://127.0.0.1:27017/ai-interview-kit
JWT_SECRET=your_jwt_secret_here
```

**2. Installation**

```bash
npm install
cd apps/web && npm install
```

**3. Running the Batch Entry Point (Section 9)**
To run the automated pipeline against a local JSON file of test cases without booting the web servers:

```bash
npm run evaluate -- --input test-input.json --output test-output.json
```

**4. Running the Web App**
You will need two terminals:

```bash
# Terminal 1: Start the Express API (runs on port 3001)
npm run dev:api

# Terminal 2: Start the Next.js Frontend (runs on port 3000)
cd apps/web && npm run dev
```

---

## 🏗 High-Level Architecture

The system is strictly divided into three layers to protect the generation pipeline from UI blockages and network timeouts:

1. **Next.js Client UI:** Manages local state for lightning-fast inline edits. Uses a smart polling mechanism during generation so the browser doesn't time out waiting for the LLM, maintaining grid consistency using `Math.max(kits.length, 9)`.
2. **Express Backend & MongoDB:** Handles JWT authentication, CRUD operations, pagination, and the `POST /regenerate` soft-merge logic.
3. **Core Generation Engine (Isolated):** A purely functional Node module that can be invoked via HTTP (Express) or CLI (`npm run evaluate`).

---

## 🔍 Retrieval & Sequencing

**Retrieval Approach & Sources Used:**
The crawler strictly respects `robots.txt`. Instead of hardcoding `/careers`, it fetches the homepage, extracts all `<a>` tags, and scores them using a heuristic dictionary (boosting paths like `/handbook` or platforms like `lever.co`).

- **Sources:** Direct company site crawling (fetching the top 3 heuristic links) and DuckDuckGo HTML search restricted to `site:reddit.com` to find public interview discussions without expensive API costs.

**Generation Sequencing (The Pipeline):**
The pipeline intentionally refuses to use a single "do everything" prompt.

1. **Extract:** LLM extracts requirements from JD (categorized strictly into `must`/`nice`).
2. **Research:** Code crawls the company site and Reddit.
3. **Synthesize Brief:** LLM writes the company brief based _only_ on scraped text.
4. **Draft Questions:** LLM generates category-specific questions mapped to Requirement IDs.
5. **Gap Check:** _Deterministic Code_ calculates coverage gaps.
6. **Second Pass:** LLM specifically targets missing `must-have` requirements.
7. **Allocate:** _Deterministic Code_ arithmetic allocates the study schedule.

---

## 💾 State Representation (The Hard Problem)

To allow partial regeneration without clobbering user edits (Section 6), every editable item (questions, flashcards) extends a `StateMetadata` schema:

```typescript
{
  origin: "generated" | "user_added",
  is_edited: boolean,
  is_pinned: boolean
}
```

**How it works:**
When the user edits a text area, the frontend immediately sets `is_edited: true`. If they click the pin icon, `is_pinned: true` is toggled. When a "Regenerate Category" request hits the backend, the Express route filters the existing array: it _keeps_ anything where `is_edited` or `is_pinned` is true, asks the LLM to generate replacements only for the discarded count, and soft-merges them back together.

---

## 📅 Schedule Allocation Logic

Scheduling is mathematical, not predictive. The `allocateSchedule` function:

1. Assigns an estimated duration to each question based on difficulty (e.g., Difficulty 1 = 15m, 3 = 45m).
2. Sorts the array so that questions covering `must-have` requirements and boasting high `difficulty` are pushed to the front.
3. Divides the total estimated minutes by `days_available` to find the daily target capacity.
4. Iterates through the sorted questions, filling Day 1 until capacity is reached, then spills over to Day 2.

---

## ⚖️ Key Design Decisions, Trade-offs & Known Limitations

**Decision 1: In-Memory Promise Queue vs. Redis/BullMQ**

- _Design:_ To prevent API rate limits during Batch JSON uploads, the backend routes requests into a native JavaScript Promise chain queue, serializing LLM requests.
- _Trade-off & Limitation:_ This avoids heavy infrastructure dependencies (Redis) keeping setup simple, but limits horizontal scalability. If deployed across multiple server instances, the queue isn't shared. Furthermore, if the Node server restarts, the in-memory queue resets.

**Decision 2: Strict UI Accessibility**

- _Design:_ The UI relies on semantic HTML (`<button>`, `<form>`) ensuring complete keyboard navigability. Forms support native `Enter` submission, file uploads use natively focusable hidden inputs, and interactive icons utilize `focus-visible` rings.

**Decision 3: Multi-Step Prompts vs. Single-Shot Generation**

- _Trade-off:_ Breaking generation into 5 discrete LLM calls means the entire pipeline takes ~30-40 seconds to complete. I accepted this slower speed in exchange for vastly superior accuracy, strict schema compliance, and the ability to inject deterministic coverage checks between passes.

**Known Limitations:**

- **DuckDuckGo Parsing:** Scraping the HTML interface of DuckDuckGo for Reddit threads is brittle; if they update their DOM classes, the public discussion search will gracefully fail and return an empty string.
- **Heuristic Crawling:** While highly effective for standard SaaS sites, extremely unconventional SPA (Single Page Application) sites with no standard anchor tags may result in the crawler failing to find the hiring page.

---

## 🛡 Edge Cases & Failure Handling

- **Strict JSON Typing:** LLM prompts explicitly enforce string literals for categories (e.g., `"String (strictly 'technical', 'behavioural', or 'domain')"`).
- **Unreachable Company Sites:** Network fetches are wrapped in `try/catch`. If the site blocks bots, the crawler returns an empty string, logs the error, and the LLM generates a kit based _solely_ on the JD without failing the run.
- **SSRF Attacks:** The crawler runs target URLs through `dns.resolve` to actively reject loopback (`127.x.x.x`) and private (`192.168.x.x`) network addresses in production.

---

## 🎨 Creative Feature: The "5-Minute Cram Sheet"

**The Problem:** Candidates often panic 10 minutes before a call. Opening a massive prep kit with 40 questions and a 5-day schedule is overwhelming right before the interview begins.

**The Solution:** A dedicated **"Cram Sheet"** view.
By tapping into the Practice Mode's `confidence` scores, this feature filters the user's kit to generate a minimalist, printable one-pager. It explicitly displays _only_ the top 3 requirements the user scored "Hard" on during flashcard practice, alongside a quick summary of the company's core product. It solves pre-interview anxiety by narrowing focus to exactly what needs last-minute reinforcement.
