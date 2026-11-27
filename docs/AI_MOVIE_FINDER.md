# AI movie finder (NVIDIA NIM)

The Search page has an **AI movie finder** panel. A user describes a movie in
plain language and gets a grid of real TMDB titles back.

## Model

- Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
- Model: `nvidia/nemotron-3.5-super-vl-120b-a12b` (Nemotron 120B, verified
  against the key's `/v1/models` list).
- Config: `VITE_NVIDIA_API_KEY` and `VITE_NVIDIA_MODEL` in `.env`. An empty key
  disables the feature gracefully.

## Movie-only guardrails

The model is never used as a chat assistant:

1. The system prompt requires exactly `{"titles":[...]}` and instructs the
   model to return `{"titles":[]}` for anything that is not a movie request.
2. User text is wrapped in `<movie_description>` tags and treated as data.
3. Free-form model text is **never rendered**. Only a JSON array of strings is
   accepted; each title is sanitised, length-limited and de-duplicated.
4. Titles are resolved through `searchMedia('movie', title, 1)`. Only titles
   that exist in TMDB become cards.
5. Non-movie input produces the fixed message: “I only find movies. Describe
   the kind of film or show you want to watch.”

## Security note

`VITE_NVIDIA_API_KEY` is compiled into the client bundle (this app has no
backend), so anyone with the APK can extract it. Before distributing:

- Restrict the key in the NVIDIA console to this model only.
- Set a spend/quota limit and rotate the key if it leaks.
- For a production-grade deployment, move the call behind a small proxy that
  holds the key server-side.
