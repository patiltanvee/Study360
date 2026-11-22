// The single place that decides how the local LLM is instructed.
// The desktop app will import this same logic. Keeping the model grounded in the
// retrieved chunks is what makes a small on-device model reliable.

function buildPrompt({ question, chunks, pkg }) {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${c.chapter} / ${c.heading})\n${c.text}`)
    .join("\n\n");

  const system = [
    `You are a study assistant for ${pkg.title} (Class ${pkg.class}, ${pkg.subject}).`,
    "Answer ONLY using the numbered context below.",
    "If the context does not contain the answer, say you could not find it in this course and suggest which chapter to revisit.",
    "Explain simply, step by step, the way a good teacher would. Cite sources like [1].",
    "Do not invent facts, formulas, or dates."
  ].join("\n");

  return { system, user: `Context:\n${context}\n\nQuestion: ${question}` };
}

module.exports = { buildPrompt };
