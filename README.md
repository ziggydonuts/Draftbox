# DraftBox — AI Caption Studio

A small web app that turns a topic into three ready-to-post social captions, complete with hashtags — built to speed up the part of content work that's usually the slowest: staring at a blank caption box.

**[Live demo](#)** · Built by Hrishika Thakur

## Why I built this

As Content Head for my university's Microsoft Student Chapter, a big part of my role is writing consistent, on-tone copy across platforms — fast. DraftBox is a tool I wished existed: give it a topic, a platform, and a tone, and it drafts three usable captions with hashtags in seconds, styled like pinned index cards you can pick from and copy.

## How it works

- Vanilla HTML, CSS, and JavaScript — no framework, no build step.
- Calls the [Google Gemini API](https://ai.google.dev) directly from the browser to generate captions.
- You bring your own API key (get a free one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)). It's stored in `sessionStorage` only — never sent anywhere but `generativelanguage.googleapis.com`, and cleared as soon as you close the tab.
- The model is prompted to return structured JSON (caption + hashtags), which is parsed and rendered as draft cards.

## Running it locally

No installation needed — it's static files.

```bash
git clone <this-repo>
cd draftbox
python3 -m http.server 8000
# open http://localhost:8000
```

## Notes on the API key approach

This is a client-only demo project, so the API key lives in the browser rather than behind a server.

## What I'd add next

- A backend proxy so the API key doesn't need to live in the browser
- Save/history of past drafts
- Support for regenerating a single draft instead of all three
- Character-count guardrails per platform (e.g. X's limit)

## Stack

`HTML` · `CSS` · `JavaScript` · `Google Gemini API`
