# AI pipeline (Gemini)

> An SDK-free REST pipeline: chat, voice and live translation — with tools that
> execute server-side (function calling).

## Big picture

```
Browser (/me/ai, /me/translate)
   │  same-origin fetch (CSRF header)
   ▼
Next.js BFF  /api/ai/{chat,stt,tts,translate}   ← validates shape, attaches JWT
   │  server→server
   ▼
Go API  /api/v1/ai/*   (JWT + rate limit ~20/min)
   │
   ▼
usecases/ai ──────────► pkg/gemini ──────► Gemini REST API
   │   ▲                 (3× backoff retry on 429/5xx/network)
   │   └─ functionResponse
   ▼
ToolDef.Execute()  ← runs ON THE BACKEND with the request context
   ├─ search_knowledge → ai_knowledge table
   └─ get_server_time  → demo tool
```

!!! note "Key principle"
    **The model decides which tool to call; the backend executes it.** The model
    never runs code. Tools run with the request's context, so RLS and timeouts
    apply to anything they touch.

## Chat flow (function-calling loop)

1. Build `contents` from history (≤ 20 turns) plus the new prompt. A voice
   message arrives as an inline base64 audio part — Gemini understands it
   directly, so no separate STT step is needed.
2. Call Gemini with the layered system instruction and the tool declarations.
3. If the reply contains **function calls**: execute each tool, append the model
   turn plus a `functionResponse` turn, and loop (up to `MaxSteps`, default 4).
   Every executed call is recorded as a `Step{Tool, Args, Result}` and returned
   to the client, so the UI can show "what the AI did".
4. If the reply is **text**: return it.

### Failure semantics

| Case | Result |
|---|---|
| Transient Gemini failure (after the client's own 3× retry) | **Not a 5xx** — a fallback reply in the user's language with `degraded: true` |
| `GEMINI_API_KEY` missing | A real error — 500, cause logged |
| Unknown or failing tool | Reported back to the model as `{"error": …}` — never surfaces directly to the client |

!!! tip "Do not change this behaviour"
    Chat must degrade gracefully to the fallback reply on transient Gemini
    failures — don't turn that into a 5xx.

## Prompt layers

The system prompt is assembled per request from three layers:

1. **Hardcoded guardrails** — fixed in code, never configurable.
2. **Scope** — from the `ai_prompts` table, editable by admins.
3. **Instructions** — likewise configured from the database.

!!! tip "Reply language"
    The frontend sends its UI language (`mn`/`en`/`zh`/`ru`) in the `lang` field and
    the assistant answers in it. If the user writes in another language, the model
    follows the user; the `degraded` fallback reply is localized the same way.

!!! warning "Never make the guardrail layer configurable"
    The guardrail layer belongs in code only. Just `scope` and `instructions`
    are driven from the database.

## Adding a tool

```go
ai.ToolDef{
    Declaration: gemini.FunctionDeclaration{
        Name:        "my_tool",
        Description: "When the model should call this…",
        Parameters:  map[string]any{ /* JSON Schema */ },
    },
    Execute: func(ctx context.Context, args map[string]any) (map[string]any, error) {
        // runs on the backend; ctx carries the request identity (RLS applies)
        return map[string]any{"result": "…"}, nil
    },
}
```

Register it in `cmd/api/server/server.go`:

```go
aiTools := append(ai.DefaultTools(), ai.KnowledgeSearchTool(aiRepo), myTool)
```

### Shipped tools

- **`search_knowledge`** — searches the `ai_knowledge` table (title/content
  `ILIKE` plus tag match, top 5). The base guardrails tell the model to call it
  *before* answering platform questions, and to say "I don't know" rather than
  guess when nothing is found. Grow the corpus by inserting rows; swap the
  single query in `repositories/postgres/ai` for tsvector or pgvector once it
  gets large.
- **`get_server_time`** — a minimal demo (Ulaanbaatar time), zero dependencies.

## Voice

| Capability | Endpoint | How it works |
|---|---|---|
| Voice chat message | `POST /ai/chat` with `audio` | Audio goes straight into the user turn as inline data — the chat model is multimodal |
| Speech-to-text | `POST /ai/stt` | One-shot call with a strict "transcribe verbatim" instruction; empty text means no speech |
| Text-to-speech | `POST /ai/tts` | A separate TTS model with `responseModalities: ["AUDIO"]`; the raw PCM (L16/24kHz) is wrapped in a WAV header so browsers can play it |
| Live translation | `POST /ai/translate` | Text → translate; audio → **two-step** STT→translate; `speak: true` adds a TTS rendering (TTS failure degrades silently — text still returned) |

Audio input is whitelisted by mime (webm/ogg/wav/mpeg/mp3/mp4/m4a/aac/flac) and
capped at ~700 KB base64 (~30s of opus) in both the BFF and the backend DTO.

!!! note "Live translation detail"
    The mic records ~7s segments using a **fresh `MediaRecorder` per segment** —
    timeslice chunks only carry the container header in the first chunk, so this
    is what makes each segment independently valid. Silent segments return empty
    fields and are dropped rather than raised as errors.

## Rate limiting

`/ai/*` is limited to roughly **20 requests per minute per IP**. Live
translation streams about 8 chunks a minute, so lower that limit with care.

Full detail lives in the repository: [`backend/docs/AI_PIPELINE.md`](https://github.com/gerege-systems/template-gerege-mn/blob/main/backend/docs/AI_PIPELINE.md).
