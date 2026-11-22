// Embedders turn text into vectors. The device MUST use the same embedder the
// package was built with, so the name is stored in the bundle and in the Package record.

const DIM = 384;

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function normalize(v) {
  let sum = 0;
  for (const x of v) sum += x * x;
  const n = Math.sqrt(sum) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

// Dev-only: a hashing-trick bag-of-words embedder. No model download, works offline,
// good enough to test the pipeline end to end. NOT for production quality retrieval.
function hashEmbed(text) {
  const v = new Float32Array(DIM);
  const tokens = text.toLowerCase().match(/[a-z0-9\u0900-\u097F]+/g) || [];
  for (let i = 0; i < tokens.length; i++) {
    const grams = [tokens[i]];
    if (i + 1 < tokens.length) grams.push(tokens[i] + " " + tokens[i + 1]);
    for (const g of grams) {
      const h = fnv1a(g);
      v[h % DIM] += (h & 0x80000000) === 0 ? 1 : -1;
    }
  }
  return normalize(v);
}

async function makeEmbedder(kind = "minilm") {
  if (kind === "dev") {
    return { name: "dev-hash-384", dim: DIM, embed: async (t) => hashEmbed(t) };
  }
  let pipeline;
  try {
    ({ pipeline } = await import("@xenova/transformers"));
  } catch {
    throw new Error("Install @xenova/transformers for real embeddings, or pass --embedder dev for testing.");
  }
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  return {
    name: "Xenova/all-MiniLM-L6-v2",
    dim: DIM,
    embed: async (t) => {
      const out = await extractor(t, { pooling: "mean", normalize: true });
      return Float32Array.from(out.data);
    }
  };
}

module.exports = { makeEmbedder, DIM };
