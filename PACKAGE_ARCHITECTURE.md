# Package architecture and per-package LLM

## 1. What a package is

One package = one class + subject (e.g. "Class 10 Science"). It is a single encrypted
file, `<id>-v<version>.bundle`. Inside is one SQLite database:

| Table       | Purpose                                                        |
|-------------|----------------------------------------------------------------|
| `meta`      | manifest, embedder name, vector size                           |
| `chunks`    | chapter text split by heading, plus an embedding vector (BLOB) |
| `questions` | test bank (MCQ now; short-answer later)                        |
| `flashcards`| front/back cards                                               |

The tests and flashcards need no AI at runtime. Only the assistant uses `chunks`.

## 2. Build pipeline (run by you, on your machine)

```
raw material            package-builder/build.js                      your server
(.md chapters,   ->  validate -> chunk by heading -> embed ->  ->  encrypt (AES-256-GCM)
 tests.json,          write SQLite -> hash                          upload .bundle
 flashcards.json)                                                   register in Admin > Packages
```

1. Put chapters in `content/01-name.md`, `02-name.md`... Use `#`/`##`/`###` headings;
   they become the citation titles the assistant shows.
2. Write `tests.json` and `flashcards.json` (formats in `sample-package/`). The builder
   rejects duplicate ids and any answer that is not one of the options.
3. `node build.js --src my-package --out dist` (add `--embedder dev` only for testing).
4. Upload the `.bundle` to your file storage, then paste the printed values into
   **Admin > Packages**.
5. Sanity check before publishing: `node query.js dist/x.bundle <key> "a real student question"`.
   If the right chunk is not in the top 3, fix the content (headings, chunk size), not the model.

New version of a package: bump `version`, rebuild with `--key <same key>`, upload, and
register it. Existing licenses keep working because the key is unchanged.

## 3. How the assistant is "trained" for one package

Short answer: do not start with training. Specialize in three layers, cheapest first.

### Layer 1: scoped retrieval (RAG). Do this first.
This is what makes the assistant "know" one package. At question time on the device:
embed the question, take the top 3-4 chunks from that package's `chunks` table, and give
only those to the model with the grounding prompt in `lib/prompt.js` (answer only from
context, say so when it is not covered, cite [1]). Facts live in the bundle, not in model
weights, so updating a package never requires retraining, and the model cannot drift into
another class's syllabus.

### Layer 2: one shared base model for all packages
Ship one small quantized model once (Qwen2.5-3B-Instruct or Phi-3-mini, Q4, about 2 GB)
with the desktop app. Do not ship a model per package: it multiplies download size and
buys little, since Layer 1 already supplies the package-specific knowledge.

### Layer 3 (optional, later): a small LoRA adapter per class or subject
Fine-tuning is for behaviour, not facts: teaching tone, step-by-step working in maths,
answering in simple English or Hinglish, always citing, saying "not in this course" when
retrieval is empty. Do it only if Layer 1 answers are correct but badly styled.

Pipeline when you reach it:
1. Generate training pairs from your own chunks: for each chunk, have a strong model
   write 5-10 student-style questions with ideal answers grounded in that chunk.
2. Review a sample by hand (or have a teacher do it). Bad pairs teach bad habits.
3. Format each example exactly like the runtime prompt: system + retrieved context + question
   -> answer. Include 10-15% examples where the context lacks the answer and the target
   answer is the refusal.
4. Train a LoRA with QLoRA (Unsloth or Axolotl) on the same base model you ship.
5. Convert the adapter to GGUF and load it with llama.cpp (`--lora adapter.gguf`).
   Adapters are 20-100 MB, so they can ride inside the package or download per class.
6. Evaluate on held-out questions (see 4) and keep the adapter only if it beats Layer 1 alone.

## 4. Quality checks (build these before trusting any answer)

- **Retrieval hit rate**: for each test question, does the chunk containing the answer
  appear in the top 3? Target above 90%. This is the number that matters most.
- **Groundedness**: answers must cite a chunk and not state facts absent from it. Spot check 50.
- **Refusal**: ask 20 out-of-syllabus questions; the assistant should say it cannot find them.
- **Embedder match**: the app must embed questions with the same model name stored in
  `meta.embedder`. The builder and `query.js` enforce this.

## 5. Security notes

- The AES key is stored in the `Package` record (hidden from catalog queries) and returned
  only by `GET /api/requests/licenses/mine` to a user with an unexpired, unrevoked license.
- The desktop app should keep the key in the OS keychain (Electron `safeStorage`), decrypt
  the database in memory or a temp file, and delete the temp file on exit.
- Be realistic: a determined student with the running app can extract content. Encryption plus
  device-bound, expiring licenses stops casual sharing, not a motivated attacker.

## 6. What is built vs next

Built: builder, encrypted bundle format, retrieval tester, admin create-package form, key delivery.
Next: bundle download endpoint (signed URL or authenticated stream), Electron shell,
decrypt-and-open on device, `llama.cpp` runtime wired to `buildPrompt`, local test and flashcard screens.
