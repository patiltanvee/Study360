#!/usr/bin/env node
/**
 * Test retrieval against a built bundle, exactly as the desktop app will do it.
 * Usage: node query.js <bundle> <keyhex> "your question" [--embedder dev|minilm]
 * Prints the top chunks and the exact prompt that would go to the local LLM.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");
const { decrypt } = require("./lib/crypto");
const { makeEmbedder } = require("./lib/embed");
const { buildPrompt } = require("./lib/prompt");

async function main() {
  const [bundlePath, keyHex, question] = process.argv.slice(2);
  if (!bundlePath || !keyHex || !question) {
    console.error('Usage: node query.js <bundle> <keyhex> "question" [--embedder dev]');
    process.exit(1);
  }
  const i = process.argv.indexOf("--embedder");
  const kind = i > -1 ? process.argv[i + 1] : "minilm";

  const tmp = path.join(os.tmpdir(), `bandhu-q-${Date.now()}.db`);
  fs.writeFileSync(tmp, decrypt(fs.readFileSync(bundlePath), Buffer.from(keyHex, "hex")));
  const db = new Database(tmp, { readonly: true });

  const builtWith = db.prepare("SELECT value FROM meta WHERE key='embedder'").get().value;
  const embedder = await makeEmbedder(kind);
  if (embedder.name !== builtWith) {
    throw new Error(`Bundle was built with "${builtWith}" but you are querying with "${embedder.name}". Vectors are not comparable.`);
  }
  const pkg = JSON.parse(db.prepare("SELECT value FROM meta WHERE key='manifest'").get().value);

  const q = await embedder.embed(question);
  const scored = db.prepare("SELECT chapter, heading, text, embedding FROM chunks").all().map((r) => {
    const v = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, r.embedding.byteLength / 4);
    let dot = 0;
    for (let k = 0; k < v.length; k++) dot += v[k] * q[k];
    return { chapter: r.chapter, heading: r.heading, text: r.text, score: dot };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  console.log("\nTop matches:");
  top.forEach((c) => console.log(`  ${c.score.toFixed(3)}  ${c.chapter} / ${c.heading}`));
  const prompt = buildPrompt({ question, chunks: top, pkg });
  console.log("\n--- SYSTEM ---\n" + prompt.system + "\n\n--- USER ---\n" + prompt.user + "\n");

  db.close();
  fs.unlinkSync(tmp);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
