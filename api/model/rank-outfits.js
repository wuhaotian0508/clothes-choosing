import { callModelJson } from "../_shared.js";

export default async function handler(req, res) {
  const { candidates, weather, occasion, preferenceTags } = req.body ?? {};
  const prompt = [
    "Rank these outfit candidates for today.",
    "Return strict JSON with an outfits array. Each item must contain id, score, reasons, warnings.",
    `Weather: ${JSON.stringify(weather)}`,
    `Occasion: ${occasion}`,
    `Preference tags: ${JSON.stringify(preferenceTags)}`,
    `Candidates: ${JSON.stringify(candidates)}`
  ].join("\n");

  const fallback = {
    outfits: Array.isArray(candidates) ? candidates.slice(0, 3) : []
  };
  const result = await callModelJson({ prompt, fallback });
  res.status(200).json(result);
}
