import { fetchWeather, geocodeLocation, sendError } from "./_shared.js";

export default async function handler(req, res) {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lon);
    const label = String(req.query.location || "Current location");
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
    const geo = hasCoordinates
      ? { name: label, latitude, longitude }
      : await geocodeLocation(String(req.query.location || process.env.WEATHER_DEFAULT_LOCATION || "Los Angeles"));
    const weather = await fetchWeather(geo);
    res.status(200).json(weather);
  } catch (error) {
    sendError(res, error);
  }
}
