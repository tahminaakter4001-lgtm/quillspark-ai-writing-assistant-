# QuillSpark — AI Writing Assistant

A bilingual Bengali/English writing workspace with an initial rule-based Bengali IT terminology checker and a server-side AI writing endpoint.

## Features
- Bengali + English responsive writing workspace
- Rewrite, summarize, translate, grammar correction, and draft modes
- Glossary-driven terminology audit with severity labels
- Server-side AI provider integration (API key is never sent to the browser)
- Request validation, basic rate limiting, security headers, and CI checks

## Requirements
- Node.js 20+
- An OpenAI API key for AI Writing features (the terminology audit works without one)

## Setup
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` on your server.
3. Start development: `npm run dev`
4. Open the Vite URL printed in the terminal (the API runs on port 8787).

Production: `npm run build`, then `npm start`. Configure your hosting platform to provide environment variables securely.

## Glossary
Edit `data/glossary.json`. Each entry supports `term`, `preferred`, `category`, `severity`, and `note`.

## Important limitations
The first audit release performs exact phrase matching only. It does not yet detect contextual misuse, inflection variants, fuzzy spelling, or document-wide style conflicts. The AI endpoint requires a configured server-side API key. Do not commit real secrets to Git.

## Project status
This is a starter implementation. Review the glossary with your terminology rules, configure hosting and secrets, and run the CI checks before production use.
