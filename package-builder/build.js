#!/usr/bin/env node
/**
 * Usage: node build.js --src ./my-package --out ./dist [--embedder minilm|dev] [--key <hex>]
 *
 * Source folder:
 *   manifest.json     { id, title, class, subject, version, language }
 *   content/*.md      chapters (headings become chunk titles)
 *   tests.json        question bank
 *   flashcards.json   flashcards
 *
 * Output:
 *   <id>-v<version>.bundle          encrypted SQLite db (this is what students download)
 *   <id>-v<version>.manifest.json   public metadata (no key)
 * Prints the values to paste into Admin > Packages. Reuse --key when publishing a new
 * version so existing licenses keep working.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");
const { chunkMarkdown } = require("./lib/chunk");
const { makeEmbedder } = require("./lib/embed");
const { newKey, encrypt, sha256 } = require("./lib/crypto");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

function fail(msg) {
  console.error(`\nBuild failed: ${msg}\n`);
  process.exit(1);
}

function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    fail(`${file} is not valid JSON (${e.message})`);
  }
}

function validate(manifest, questions, flashcards) {
  for (const k of ["id", "title", "class", "subject", "version"]) {
    if (!manifest[k]) fail(`manifest.json is missing "${k}"`);
  }
  const seen = new Set();
  for (const q of questions) {
    if (!q.id || !q.question || !Array.isArray(q.options) || q.options.length < 2) {
      fail(`question ${q.id || "(no id)"} needs id, question and at least 2 options`);
    }
    if (seen.has(q.id)) fail(`duplicate question id ${q.id}`);
    seen.add(q.id);
    if (!q.options.includes(q.answer)) fail(`question ${q.id}: answer must match one of the options exactly`);
  }
  for (const f of flashcards) {
    if (!f.id || !f.front || !f.back) fail(`flashcard ${f.id || "(no id)"} needs id, front, back`);
  }
}

async function main() {
  const src = arg("src");
  const out = arg("out", "dist");
  if (!src) fail("pass --src <folder>");

  const manifest = readJSON(path.join(src, "manifest.json"));
  if (!manifest) fail(`no manifest.json in ${src}`);
  const questions = readJSON(path.join(src, "tests.json"), []);
  const flashcards = readJSON(path.join(src, "flashcards.json"), []);
  validate(manifest, questions, flashcards);

  const contentDir = path.join(src, "content");
  const files = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir).filter((f) => f.endsWith(".md")).sort()
    : [];
  if (!files.length) fail(`no .md chapters in ${contentDir}`);

  const embedder = await makeEmbedder(arg("embedder", "minilm"));
  console.log(`Embedder: ${embedder.name}`);

  const tmp = path.join(os.tmpdir(), `bandhu-${Date.now()}.db`);
  const db = new Database(tmp);
  db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE chunks (id INTEGER PRIMARY KEY, chapter TEXT, heading TEXT, text TEXT, embedding BLOB);
    CREATE TABLE questions (id TEXT PRIMARY KEY, chapter TEXT, type TEXT, question TEXT, options TEXT, answer TEXT, explanation TEXT);
    CREATE TABLE flashcards (id TEXT PRIMARY KEY, chapter TEXT, front TEXT, back TEXT);
  `);

  const putMeta = db.prepare("INSERT INTO meta VALUES (?, ?)");
  putMeta.run("manifest", JSON.stringify(manifest));
  putMeta.run("embedder", embedder.name);
  putMeta.run("dim", String(embedder.dim));

  const putChunk = db.prepare("INSERT INTO chunks (chapter, heading, text, embedding) VALUES (?,?,?,?)");
  let chunkCount = 0;
  for (const file of files) {
    const chapter = file.replace(/\.md$/, "").replace(/^\d+-/, "").replace(/-/g, " ");
    const chunks = chunkMarkdown(fs.readFileSync(path.join(contentDir, file), "utf8"));
    for (const c of chunks) {
      // embed heading + text so a question about the topic name still matches
      const vec = await embedder.embed(`${c.heading}\n${c.text}`);
      putChunk.run(chapter, c.heading, c.text, Buffer.from(vec.buffer));
      chunkCount++;
    }
  }

  const putQ = db.prepare("INSERT INTO questions VALUES (?,?,?,?,?,?,?)");
  for (const q of questions) {
    putQ.run(q.id, q.chapter || "", q.type || "mcq", q.question, JSON.stringify(q.options), q.answer, q.explanation || "");
  }
  const putF = db.prepare("INSERT INTO flashcards VALUES (?,?,?,?)");
  for (const f of flashcards) putF.run(f.id, f.chapter || "", f.front, f.back);

  db.close();

  const key = arg("key") ? Buffer.from(arg("key"), "hex") : newKey();
  if (key.length !== 32) fail("--key must be 64 hex characters (32 bytes)");

  const bundle = encrypt(fs.readFileSync(tmp), key);
  fs.unlinkSync(tmp);

  fs.mkdirSync(out, { recursive: true });
  const base = `${manifest.id}-v${manifest.version}`;
  const bundlePath = path.join(out, `${base}.bundle`);
  fs.writeFileSync(bundlePath, bundle);

  const digest = sha256(bundle);
  const sizeMB = +(bundle.length / 1024 / 1024).toFixed(2);
  fs.writeFileSync(
    path.join(out, `${base}.manifest.json`),
    JSON.stringify({ ...manifest, embedder: embedder.name, chunks: chunkCount, questions: questions.length, flashcards: flashcards.length, sizeMB, sha256: digest }, null, 2)
  );

  console.log(`\nBuilt ${bundlePath}`);
  console.log(`  ${chunkCount} chunks · ${questions.length} questions · ${flashcards.length} flashcards · ${sizeMB} MB\n`);
  console.log("Paste into Admin > Packages:");
  console.log(`  Title:            ${manifest.title}`);
  console.log(`  Class / Subject:  ${manifest.class} / ${manifest.subject}`);
  console.log(`  Bundle path:      bundles/${base}.bundle   (upload the file there)`);
  console.log(`  Size (MB):        ${sizeMB}`);
  console.log(`  Bundle SHA-256:   ${digest}`);
  console.log(`  Encryption key:   ${key.toString("hex")}`);
  console.log("\nKeep the key private. Reuse it with --key when you publish a new version.\n");
}

main().catch((e) => fail(e.message));
