# Study packages — offline AI app for students

This is the scaffold for the control-plane (server + web client) described in the
architecture: students browse packages, request access, an admin approves, and a
device-bound license unlocks a downloadable content bundle. What's NOT included
yet is the offline runtime itself (the desktop/mobile shell, local AI, local test
and flashcard engine) — see "Next steps" below for exactly how that plugs in.

## What's here

```
server/                  Node + Express API (the online control plane)
  models/                User, Package, AccessRequest, License (Mongoose)
  controllers/            business logic for auth, packages, requests, licenses
  routes/                 /api/auth, /api/packages, /api/requests, /api/admin
  middleware/auth.js      JWT auth + admin gate
  utils/generateLicense.js  signs a device-bound license token on approval
  server.js               entrypoint

package-builder/         CLI that turns raw class material into an encrypted offline bundle
                         (see PACKAGE_ARCHITECTURE.md and sample-package/)

client/                  React (Vite) web app — works as the browsing/admin UI
  src/pages/              Login, Register, PackageCatalog, RequestStatus,
                           StudentDashboard, AdminPanel
  src/context/AuthContext.jsx
  src/api/                axios instance + device id helper
```

## Running it

```bash
# server
cd server
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET, LICENSE_SECRET
npm install
npm run dev                # http://localhost:5000

# client
cd client
npm install
npm run dev                # http://localhost:5173
```

Packages: build one with `package-builder` (`npm run build:sample` to try it), then register it in
Admin > Packages. See PACKAGE_ARCHITECTURE.md.

Create your first admin manually: register normally, then in MongoDB set
`role: "admin"` on that user document.

## The flow this scaffold implements

1. Student registers/logs in, browses `/packages` (metadata only).
2. Student requests access → `POST /api/requests` creates a pending `AccessRequest`.
3. Admin opens `/admin`, sees the queue, approves or rejects.
4. On approval, the server signs a **device-bound JWT license**
   (`utils/generateLicense.js`) and stores it in `License`. The student's app
   fetches it via `GET /api/requests/licenses/mine`.
5. From here on, the design intent is that the client validates that license
   **locally** and doesn't need to call the server again except for an optional
   periodic revalidation (`POST /api/requests/licenses/:packageId/revalidate`)
   and to pull the actual package bundle.

## Next steps (the offline + AI half)

This scaffold deliberately stops at "license issued, ready to download" because
that part is client-shell-specific. To finish it:

1. **Wrap the client in Electron (recommended) or React Native.**
   A pure browser PWA can't easily bundle a local LLM at usable size/speed —
   Electron gives you Node bindings for `llama.cpp`, real filesystem access for
   SQLite, and a proper installer for students without reliable internet.

2. **Add a download step after license fetch.** When `StudentDashboard` shows an
   approved package, call a new server route that returns a signed, time-limited
   URL to the encrypted bundle in your package store (S3 or similar), download it,
   decrypt with a key derived from the license token, and unzip into local storage
   (SQLite for structured content/tests/flashcards).

3. **Local AI assistant.** Each package bundle should ship:
   - the syllabus content, chunked
   - pre-computed embeddings for those chunks (build once, server-side, at publish time)
   - a quantized small model (Phi-3-mini / Gemma 2B / Qwen2.5-3B) — either bundled
     once with the app installer (shared across all packages) or a class-level
     download the first time a student unlocks any package for that class.
   At runtime: embed the student's question locally, retrieve top chunks with a
   local vector search (`hnswlib-node` or flat cosine over SQLite), and generate the
   answer locally with `llama.cpp` — zero network calls.

4. **Tests and flashcards** don't need AI at all — they're just JSON/SQLite data in
   the bundle, graded with a small local rules engine. Build these as plain local
   React views reading from the local DB.

5. **License re-validation cadence.** Decide how often the app must briefly go
   online to call the revalidate endpoint (e.g. every 30 days) before it locks
   the package again — this is your main anti-piracy lever without requiring
   constant connectivity.
# Study360

