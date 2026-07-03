# 🧠 Learnograph — AI Learning Roadmap

**Type any topic → Get an AI-generated learning roadmap → Track your mastery as you read.**

Learnograph is a web app that generates personalized learning mind-maps. As you read articles around the web, paste in the URL — the AI figures out which topics you've covered and tracks your progress automatically.

[![Deploy to EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/makers/new?template=learnographer)

## ✨ Features

- **AI-Generated Learning Trees** — Enter any topic and get a structured curriculum with 4-8 main subtopics, each with 2-4 focused leaf topics
- **Smart URL Analysis** — Paste any article URL; the AI reads it and identifies which learning topics it covers
- **One-Click Confirmation** — Review AI suggestions with justifications, then confirm or dismiss with a single click
- **Visual Progress Tracking** — Overall progress bar + per-branch progress rings show your mastery at a glance
- **Beautiful Dark UI** — Modern design with smooth animations, glassmorphism, and an emerald/teal accent palette

## 🚀 Core Loop

1. **Enter a topic** — "What do you want to learn?" (e.g., "Kubernetes", "Machine Learning")
2. **Explore the roadmap** — Interactive expandable tree with all subtopics you need to master
3. **Read articles** — Go learn! Read docs, tutorials, blog posts
4. **Paste URLs** — Come back and paste the URL of what you just read
5. **AI suggests completions** — The AI identifies which tree nodes the article covers
6. **Confirm & progress** — One click to mark topics complete; watch your progress bar fill up

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: EdgeOne Makers cloud functions (Python)
- **AI**: Anthropic-compatible API via EdgeOne AI Gateway
- **Deployment**: Tencent EdgeOne Pages

## 📦 Project Structure

```
learnographer/
├── src/                           # React + TypeScript frontend
│   ├── App.tsx                   # Main app orchestrator
│   ├── api.ts                    # API client (generateTree, analyzeUrl)
│   ├── types.ts                  # TypeScript types
│   └── components/               # UI components
│       ├── LandingScreen.tsx     # Topic input hero screen
│       ├── TreeView.tsx          # Interactive tree visualization
│       ├── ProgressBar.tsx       # Overall mastery progress
│       ├── UrlInput.tsx          # "Paste a link" input
│       ├── SuggestionCard.tsx    # AI suggestion confirm/dismiss
│       └── SourcesList.tsx       # Read articles history
├── cloud-functions/               # Python serverless functions
│   ├── generate-tree/index.py   # POST /generate-tree
│   └── analyze-url/index.py     # POST /analyze-url
├── edgeone.json                   # EdgeOne deployment config
├── DEPLOY.md                      # Deployment instructions
└── package.json
```

## ⚙️ Environment Variables

| Variable              | Required | Description                                    |
|-----------------------|----------|------------------------------------------------|
| `AI_GATEWAY_API_KEY`  | Yes      | EdgeOne Makers AI Gateway API key              |
| `AI_GATEWAY_BASE_URL` | Yes      | `https://ai-gateway.edgeone.link/v1`           |
| `AI_GATEWAY_MODEL`    | No       | Defaults to `@makers/deepseek-v4-flash` (free) |

Alternatively, set `ANTHROPIC_API_KEY` to use the Anthropic API directly.

## 🧑‍💻 Local Development

```bash
npm install
cp .env.example .env       # Fill in AI_GATEWAY_API_KEY + AI_GATEWAY_BASE_URL
edgeone makers dev          # Starts both frontend + cloud functions
```

## 🌐 Deployment

See [DEPLOY.md](./DEPLOY.md) for step-by-step EdgeOne deployment instructions.

## 📜 License

MIT
