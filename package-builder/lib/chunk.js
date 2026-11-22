// Splits markdown into retrieval chunks that respect headings.
// Each chunk keeps its heading so answers can say "from: Photosynthesis > Light reactions".

function chunkMarkdown(md, { maxWords = 300 } = {}) {
  const lines = md.split(/\r?\n/);
  const chunks = [];
  const trail = [];
  let buf = [];
  let words = 0;

  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) chunks.push({ heading: trail.filter(Boolean).join(" > "), text });
    buf = [];
    words = 0;
  };

  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1].length;
      trail.length = level - 1;
      trail[level - 1] = h[2].trim();
      continue;
    }
    buf.push(line);
    words += line.split(/\s+/).filter(Boolean).length;
    // split long sections at paragraph breaks
    if (words >= maxWords && line.trim() === "") flush();
  }
  flush();
  return chunks;
}

module.exports = { chunkMarkdown };
