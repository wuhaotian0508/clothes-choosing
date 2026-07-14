import { callModelJson, splitTags } from "../_shared.js";

export default async function handler(req, res) {
  const { imageDataUrl, description } = req.body ?? {};
  const prompt = [
    "Analyze this liked outfit reference for a personal outfit recommendation app.",
    "Return strict JSON with: styleTags, notes.",
    "Use concise lowercase English tags describing silhouette, vibe, colors, formality, season, and styling.",
    description ? `User note: ${description}` : ""
  ].join("\n");

  const fallback = {
    styleTags: splitTags(description).length ? splitTags(description) : ["clean", "casual"],
    notes: description || "Manual style reference. Add or edit tags to improve recommendations."
  };
  const result = await callModelJson({ prompt, imageDataUrl, fallback });
  res.status(200).json(result);
}
