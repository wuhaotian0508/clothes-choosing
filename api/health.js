export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    modelConfigured: Boolean(process.env.MODEL_BASE_URL && process.env.MODEL_API_KEY),
    weatherProvider: "open-meteo"
  });
}
