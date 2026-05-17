# 🏏 CRIQ — Cricket Intelligence Platform

> **Data & Insights** — _Translating complex match and player data into intuitive, actionable insights for cricket fans._

CRIQ is a full-stack IPL analytics dashboard that makes cricket statistics accessible to everyone — from die-hard fans to casual viewers who've never heard of a "strike rate." Powered by ball-by-ball data and Google Gemini AI, CRIQ turns raw numbers into stories.

![Tech Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Pandas-009688?style=flat-square&logo=fastapi)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square&logo=google)
![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript)

---

## 📸 Screenshots

| | | |
|:---:|:---:|:---:|
| ![Home & Scoreboard](UI/Screenshot%202026-05-17%20085149.png) | ![Match Summary](UI/Screenshot%202026-05-17%20085229.png) | ![Match Analysis](UI/Screenshot%202026-05-17%20085332.png) |
| **Home & Scoreboard** | **Player Intelligence** | **Match Analysis** |

---

## 📸 Features at a Glance

| Page                  | What it does                                                                      |
| --------------------- | --------------------------------------------------------------------------------- |
| 🏠 **Home**           | Live-style scoreboard, win probability chart, pressure heatmap, AI match story    |
| 📰 **Match Summary**  | AI narrative, fan theories, pre/post match predictions, phase breakdowns          |
| 🏏 **Match Analysis** | Per-team deep dive: batting/bowling stats, over-by-over bar chart, pressure index |
| 📈 **Momentum**       | Cumulative run chart with key moment markers, AI match narration                  |
| 👤 **Player**         | Career stats, form trajectory, D3 wagon wheel, head-to-head matchup               |
| 📊 **Team**           | Toss impact, phase bars, acceleration detector, field gap analysis                |
| ⚡ **Fan Tools**      | What-if simulator, fantasy leaderboard, stat explainer drawer                     |
| 🧠 **Fan IQ Quiz**    | AI-generated match-specific quiz with rank badges and animated results            |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Kaggle IPL Dataset](https://www.kaggle.com/datasets/patrickb1912/ipl-complete-dataset-20082020) (`matches.csv` + `deliveries.csv`)

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Place your dataset files in `backend/data/`:

```
backend/
└── data/
    ├── matches.csv
    └── deliveries.csv
```

Create `backend/.env`:

```env
# Optional — only needed if you want backend AI fallback
GEMINI_API_KEY=your_key_here
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

---

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

> 🔑 **Get a free Gemini API key** at [Google AI Studio](https://aistudio.google.com/app/apikey) — it's free and takes 30 seconds.

Start the dev server:

```bash
npm run dev
```

Open **http://localhost:5173** — the app is live!

---

## 🧠 AI Features

CRIQ integrates Google Gemini AI directly in the frontend (`src/utils/ai.ts`) for three core experiences:

### 1. 📰 AI Match Narrative

Located on the **Match Summary** page. Generates a plain-English 3-sentence post-match report from real innings data, explaining what happened and why — like a cricket journalist.

```
"In a pulsating contest, Mumbai Indians set a commanding target of 187,
anchored by Rohit Sharma's brisk half-century. Chennai's chase faltered
in the middle overs as Bumrah applied pressure with two crucial wickets,
ultimately securing a 23-run victory for the hosts."
```

### 2. 🧠 Fan IQ Quiz

Located on the **Fan IQ** page. Generates 4 match-specific multiple-choice questions using real player names, scores, and bowling figures from the selected match. Includes simple explanations for every answer.

**Rank system:** Cricket Genius 🏆 → Match Expert 🎯 → Casual Fan 👀 → Keep Watching! 📺

### 3. ✨ Stat Explainer Drawer

Accessible from any **"?"** button on stat badges. Explains what any cricket statistic means in plain English, and whether the current value is good, average, or poor by IPL standards.

**AI Resilience:** If the Gemini API is unavailable (rate limit, no key), the app gracefully falls back to intelligent pre-written responses — the UI never breaks.

---

## 🏗️ Architecture

```
Cricket_IQ/
├── backend/                 # FastAPI + Pandas analytics engine
│   ├── main.py              # API routes (12 endpoints)
│   ├── data.py              # All analytics logic (ball-by-ball processing)
│   ├── requirements.txt     # Python dependencies
│   └── data/                # CSV datasets (gitignored)
│
└── frontend/                # React + Vite + TypeScript
    └── src/
        ├── pages/           # Full page views
        │   ├── Home.tsx         # Scoreboard + win prob + pressure
        │   ├── MatchSummary.tsx # AI narrative + fan theories
        │   ├── MatchAnalysis.tsx# Deep team analytics
        │   ├── Player.tsx       # Player profile + wagon wheel
        │   ├── Team.tsx         # Team phase analysis
        │   └── FanTools.tsx     # Simulator + fantasy
        │
        ├── components/      # Reusable UI components
        │   ├── StatExplainer.tsx    # AI-powered stat drawer
        │   ├── FanIQQuiz.tsx        # AI quiz with rank system
        │   ├── MomentumChart.tsx    # Run progression + narration
        │   ├── WinProbChart.tsx     # Area chart: win probability
        │   ├── PressureBar.tsx      # Over-by-over pressure heatmap
        │   ├── WagonWheel.tsx       # D3 shot direction chart
        │   ├── MatchupCard.tsx      # Head-to-head bat vs bowl
        │   └── StatBadge.tsx        # Tooltip stat cards
        │
        ├── utils/
        │   └── ai.ts            # Gemini API client + mock fallback
        │
        ├── api/
        │   └── client.ts        # Axios API client + TypeScript types
        │
        └── store/
            └── useStore.ts      # Zustand global state
```

---

## 🔌 API Reference

| Method | Endpoint                     | Description                       |
| ------ | ---------------------------- | --------------------------------- |
| `GET`  | `/matches`                   | List all matches with filters     |
| `GET`  | `/match/{id}/summary`        | Full scoreboard + win probability |
| `GET`  | `/match/{id}/analysis?team=` | Deep per-team analytics           |
| `GET`  | `/match/{id}/pressure?team=` | Over-by-over pressure index       |
| `GET`  | `/match/{id}/simulate`       | What-if scenario projections      |
| `GET`  | `/player/{name}/stats`       | Career batting & bowling stats    |
| `GET`  | `/player/{name}/wagonwheel`  | Shot location data for D3         |
| `GET`  | `/matchup?bat=&bowl=`        | Head-to-head batter vs bowler     |
| `GET`  | `/team/{name}/phases`        | Phase-by-phase team breakdown     |
| `GET`  | `/venue/{name}/toss`         | Toss win/loss stats at venue      |
| `GET`  | `/fantasy/{match_id}`        | Fantasy impact leaderboard        |
| `GET`  | `/stat/explain?stat=&value=` | Statistical benchmarks            |

---

## 🎨 Design System

- **Color Palette:** Dark navy background (`#0F1117`), green accents (`#00FF87`), amber highlights (`#FFB547`)
- **Typography:** Inter (body) + custom `font-stat` for numbers
- **Charts:** Recharts (line, area, bar) + D3.js (wagon wheel)
- **Animations:** CSS keyframe animations, shimmer loading skeletons, cubic-bezier transitions
- **Layout:** Responsive sidebar navigation (mobile-friendly bottom bar)

---

## 📦 Tech Stack

### Frontend

| Library         | Purpose                               |
| --------------- | ------------------------------------- |
| React 18 + Vite | UI framework + build tool             |
| TypeScript      | Type safety                           |
| Tailwind CSS    | Utility styling                       |
| Recharts        | Win probability, bar charts, momentum |
| D3.js           | Wagon wheel shot visualization        |
| Zustand         | Global state (match selection)        |
| React Router    | Client-side navigation                |
| Axios           | API client                            |

### Backend

| Library       | Purpose                      |
| ------------- | ---------------------------- |
| FastAPI       | REST API framework           |
| Pandas        | Ball-by-ball data processing |
| NumPy         | Statistical calculations     |
| Uvicorn       | ASGI server                  |
| python-dotenv | Environment config           |
| httpx         | Async HTTP client            |

### AI

| Service                 | Usage                                                |
| ----------------------- | ---------------------------------------------------- |
| Google Gemini 2.0 Flash | Match narratives, stat explanations, quiz generation |

---

## 📊 Data Requirements

The project uses the **Kaggle IPL Complete Dataset** (2008–2020+):

**`matches.csv`** — One row per match:

- `match_id`, `team1`, `team2`, `winner`, `venue`, `date`, `toss_winner`, `toss_decision`, `player_of_match`

**`deliveries.csv`** — One row per ball:

- `match_id`, `inning`, `batting_team`, `bowling_team`, `over`, `ball`, `batter`, `bowler`, `batsman_runs`, `extra_runs`, `total_runs`, `is_wicket`, `player_dismissed`

**Dataset Source:** [Kaggle — IPL Complete Dataset](https://www.kaggle.com/datasets/patrickb1912/ipl-complete-dataset-20082020)

---

## 🌱 Environment Variables

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8000        # Backend base URL
VITE_GEMINI_API_KEY=            # Google Gemini API key (optional but recommended)
```

### `backend/.env`

```env
GEMINI_API_KEY=                   # Optional: backend AI fallback
```

> **Note:** The app works without a Gemini key — AI features fall back to curated mock responses. Get a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey).

---

## 🤝 Solving the Problem Statement

**Challenge 2: Data & Insights** required a solution that:

> _"Translates complex match and player data into intuitive and actionable insights for fans. The system should simplify advanced statistics and present them in a way that enhances understanding, decision-making, and overall engagement with the sport."_

CRIQ addresses this through:

- **Plain English Explanations** — Every stat has a hover tooltip explaining it in simple terms (e.g., _"Strike rate: how many runs the batter would score if they faced 100 balls"_)
- **AI Match Stories** — Post-match narratives generated for casual fans, not statisticians
- **Visual Probability** — Win probability chart shows match tension without requiring statistical knowledge
- **Fan Theories** — Auto-generated "What if?" scenarios make data exploration fun and accessible
- **Quiz Gamification** — Fans learn cricket concepts through match-specific questions with explanations
- **Graceful Degradation** — All features work without an internet connection to AI APIs

---

## 👨‍💻 Author

**Pratham Raval**

---

## 📝 License

MIT © 2026 CRIQ Team
