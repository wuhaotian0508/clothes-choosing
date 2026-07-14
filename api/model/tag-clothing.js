import { callModelJson, inferClothingFallback } from "../_shared.js";

export default async function handler(req, res) {
  const { imageDataUrl, description } = req.body ?? {};
  const prompt = [
    "Analyze this wardrobe item for a personal outfit recommendation app.",
    "Return strict JSON with: name, category, colors, seasonTags, weatherTags, occasionTags, styleTags, warmthLevel, formalityLevel.",
    "Use concise lowercase English tags. category must be one of top, bottom, shoes, outerwear, accessory, onepiece.",
    description ? `User description: ${description}` : ""
  ].join("\n");

  const result = await callModelJson({
    prompt,
    imageDataUrl,
    fallback: inferClothingFallback(description)
  });
  res.status(200).json(result);
}
