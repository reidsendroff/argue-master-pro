# ArgueMaster Pro

> Debate any AI persona. Get destroyed. Get better.

An AI debate coach that generates real-time, persona-driven argumentation with live voice delivery. Pick a topic, choose a side, and go head-to-head against AI opponents modeled after famous thinkers and public figures — each with their own rhetorical style, adapted to your skill level.

Built by Reid Sendroff as part of an AI Club initiative at Northern Highlands Regional High School to demonstrate how modern LLM tools can produce complete, interactive applications in days.

---

## Features

- **10+ debate personas** — Obama, Ben Shapiro, Christopher Hitchens, Jordan Peterson, AOC, Socrates, Trump, and more, each with distinct speech patterns and rhetorical tactics
- **4 difficulty levels** — Beginner, Intermediate, Expert, and Hell Mode (no mercy)
- **Live voice I/O** — speak your arguments via microphone (Whisper STT), hear the AI respond in character (ElevenLabs TTS with persona-matched voices)
- **Real-time scoring** — clarity, logic, structure, and persuasion power tracked per round
- **Live coaching sidebar** — issues detected, coach tips, and argument analytics updated as you type
- **Debate history** — sessions saved per user with round-by-round transcripts

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase Postgres (with RLS) |
| Auth | Supabase Auth |
| Debate AI | OpenAI GPT-4o-mini |
| Text-to-Speech | ElevenLabs (persona-mapped voices) + OpenAI TTS fallback |
| Speech-to-Text | OpenAI Whisper |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account
- OpenAI API key
- ElevenLabs API key

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/reidsendroff/argue-master-pro.git
cd argue-master-pro

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your Supabase URL, anon key, and API keys

# 4. Start the dev server
npm run dev
```

App runs at `http://localhost:8080`.

### Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
npx supabase link --project-ref <your-project-ref>

# Apply the database migration
npx supabase db push

# Set edge function secrets
npx supabase secrets set OPENAI_API_KEY=your_key ELEVENLABS_API_KEY=your_key

# Deploy edge functions
npx supabase functions deploy debate-ai
npx supabase functions deploy text-to-speech
npx supabase functions deploy speech-to-text
```

### Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_ref
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Project Structure

```
src/
  pages/
    Index.tsx          # Landing page
    Auth.tsx           # Sign in / sign up
    TopicSelection.tsx # Pick topic, side, persona, difficulty
    DebateRoom.tsx     # Main debate interface
    Results.tsx        # Post-debate summary
  hooks/
    useAuth.tsx        # Supabase auth hook
  integrations/
    supabase/          # Auto-generated Supabase client + types

supabase/
  functions/
    debate-ai/         # GPT-4o-mini persona debate engine
    text-to-speech/    # ElevenLabs + OpenAI TTS
    speech-to-text/    # Whisper transcription
  migrations/          # Postgres schema
```

## License

MIT — see [LICENSE](LICENSE)
