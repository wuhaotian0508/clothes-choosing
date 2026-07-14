import { CloudSun, RefreshCcw, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppSettings, Occasion, OutfitCandidate, WardrobeItem, WeatherSnapshot } from "../types";
import { fetchWeather, rankOutfits } from "../lib/api";
import { buildRecommendations } from "../lib/recommendation";
import { saveRecommendation } from "../lib/storage";

const occasions: Occasion[] = ["class", "commute", "date", "sport", "casual", "formal", "travel"];

export default function TodayView({
  wardrobe,
  preferenceTags,
  settings,
  onSaved
}: {
  wardrobe: WardrobeItem[];
  preferenceTags: string[];
  settings: AppSettings;
  onSaved: () => Promise<void>;
}) {
  const [occasion, setOccasion] = useState<Occasion>("class");
  const [weather, setWeather] = useState<WeatherSnapshot | undefined>();
  const [outfits, setOutfits] = useState<OutfitCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const itemsById = useMemo(() => new Map(wardrobe.map((item) => [item.id, item])), [wardrobe]);

  async function handleWeather() {
    setBusy(true);
    setMessage("Fetching weather");
    try {
      const nextWeather = await fetchWeather(settings);
      setWeather(nextWeather);
      setMessage("Weather ready");
      return nextWeather;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Weather failed");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function handleRecommend() {
    setBusy(true);
    setMessage("Building outfits");
    try {
      const todayWeather = weather ?? (await fetchWeather(settings));
      setWeather(todayWeather);
      const deterministic = buildRecommendations({
        wardrobe,
        weather: todayWeather,
        occasion,
        preferenceTags
      });

      if (deterministic.length === 0) {
        setOutfits([]);
        setMessage("Add at least one top, bottom, and shoes suitable for today");
        return;
      }

      const ranked = await rankOutfits({
        candidates: deterministic,
        weather: todayWeather,
        occasion,
        preferenceTags
      });
      const finalOutfits = ranked.outfits?.length ? ranked.outfits.slice(0, 3) : deterministic;
      setOutfits(finalOutfits);
      await saveRecommendation({
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        occasion,
        weatherSnapshot: todayWeather,
        outfits: finalOutfits,
        createdAt: new Date().toISOString()
      });
      await onSaved();
      setMessage("Recommendations ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recommendation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="today-layout">
      <section className="panel today-controls">
        <div className="panel-heading">
          <h2>Today</h2>
          <span>{message}</span>
        </div>
        <label className="field">
          <span>Occasion</span>
          <select value={occasion} onChange={(event) => setOccasion(event.target.value as Occasion)}>
            {occasions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="weather-strip">
          <CloudSun size={22} />
          {weather ? (
            <div>
              <strong>{Math.round(weather.feelsLikeC)}C feels like</strong>
              <span>{weather.location} · {weather.condition} · rain {weather.precipitationMm}mm · wind {Math.round(weather.windKph)}kph</span>
            </div>
          ) : (
            <div>
              <strong>No weather loaded</strong>
              <span>{settings.location}</span>
            </div>
          )}
        </div>
        <div className="button-row">
          <button className="secondary" onClick={handleWeather} disabled={busy}>
            <RefreshCcw size={17} /> Weather
          </button>
          <button onClick={handleRecommend} disabled={busy || wardrobe.length < 3}>
            <Wand2 size={17} /> Recommend
          </button>
        </div>
        <div className="tags">
          {preferenceTags.slice(0, 12).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </section>

      <section className="recommendation-list">
        {outfits.map((outfit, index) => (
          <article className="outfit-card" key={outfit.id}>
            <div className="outfit-header">
              <h3>Outfit {index + 1}</h3>
              <span>{Math.round(outfit.score)} pts</span>
            </div>
            <div className="outfit-items">
              {outfit.itemIds.map((id) => {
                const item = itemsById.get(id);
                if (!item) return null;
                return (
                  <div className="outfit-item" key={id}>
                    {item.imagePreviewUrl ? <img src={item.imagePreviewUrl} alt="" /> : <div className="image-placeholder" />}
                    <strong>{item.name}</strong>
                    <span>{item.category}</span>
                  </div>
                );
              })}
            </div>
            <ul className="reason-list">
              {outfit.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
              {outfit.warnings.map((warning) => (
                <li className="warning" key={warning}>{warning}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
