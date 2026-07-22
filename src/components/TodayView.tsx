import { CloudSun, Mic, MicOff, RefreshCcw, Wand2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { AppSettings, Occasion, OutfitCandidate, WardrobeItem, WeatherSnapshot } from "../types";
import { fetchWeather, rankOutfits } from "../lib/api";
import { buildRecommendations } from "../lib/recommendation";
import { saveRecommendation } from "../lib/storage";
import { startVoiceInput, supportsVoiceInput, type BrowserSpeechRecognition } from "../lib/voiceInput";
import YiyiMark from "./YiyiMark";

const occasions: Occasion[] = ["class", "commute", "date", "sport", "casual", "formal", "travel"];

export default function TodayView({ wardrobe, preferenceTags, settings, onSaved }: {
  wardrobe: WardrobeItem[];
  preferenceTags: string[];
  settings: AppSettings;
  onSaved: () => Promise<void>;
}) {
  const [occasion, setOccasion] = useState<Occasion>("class");
  const [dayDescription, setDayDescription] = useState("");
  const [weather, setWeather] = useState<WeatherSnapshot>();
  const [outfits, setOutfits] = useState<OutfitCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ recognition: BrowserSpeechRecognition; stop: () => void } | null>(null);
  const itemsById = useMemo(() => new Map(wardrobe.map((item) => [item.id, item])), [wardrobe]);

  async function handleWeather() {
    setBusy(true);
    setMessage("Fetching weather");
    try {
      const nextWeather = await fetchWeather(settings);
      setWeather(nextWeather);
      setMessage("Weather ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Weather failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecommend() {
    setBusy(true);
    setMessage("Choosing from your wardrobe");
    try {
      const todayWeather = weather ?? await fetchWeather(settings);
      setWeather(todayWeather);
      const deterministic = buildRecommendations({ wardrobe, weather: todayWeather, occasion, preferenceTags });
      if (!deterministic.length) {
        setOutfits([]);
        setMessage("Add a top, bottom, and shoes to get a recommendation");
        return;
      }
      const ranked = await rankOutfits({ candidates: deterministic, weather: todayWeather, occasion, preferenceTags });
      const finalOutfits = ranked.outfits?.length ? ranked.outfits.slice(0, 3) : deterministic;
      setOutfits(finalOutfits);
      await saveRecommendation({
        id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), occasion,
        weatherSnapshot: todayWeather, outfits: finalOutfits, createdAt: new Date().toISOString()
      });
      await onSaved();
      setMessage("Your answer is ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recommendation failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    if (!supportsVoiceInput()) {
      setMessage("Voice input is not supported in this browser");
      return;
    }
    try {
      setListening(true);
      recognitionRef.current = startVoiceInput({
        onTranscript: (text) => { setDayDescription(text); setMessage("Heard your day — edit it or choose your outfit"); },
        onEnd: () => { setListening(false); recognitionRef.current = null; },
        onError: () => { setListening(false); setMessage("Voice input stopped. You can continue typing."); recognitionRef.current = null; }
      });
      setMessage("Listening...");
    } catch (error) {
      setListening(false);
      setMessage(error instanceof Error ? error.message : "Voice input failed");
    }
  }

  return (
    <section className="today-page" aria-label="Today">
      <header className="page-intro">
        <div><p className="eyebrow">Today</p><h1>Tell YiYi about your day.</h1></div>
        <span className="mode-badge"><i />Text + voice</span>
      </header>
      <div className="today-grid">
        <section className="intent-card">
          <div className="intent-mark"><YiyiMark size={100} /><span>Ready when you are</span></div>
          <label className="intent-field">
            <span>Your day</span>
            <span className="intent-input-shell">
              <textarea aria-label="Your day" value={dayDescription} onChange={(event) => setDayDescription(event.target.value)} placeholder="Class in the morning, dinner tonight, and lots of walking." />
              <button type="button" className={`voice-input-button ${listening ? "listening" : ""}`} onClick={toggleVoiceInput} aria-label={listening ? "Stop voice input" : "Start voice input"}>{listening ? <MicOff size={17} /> : <Mic size={17} />}</button>
            </span>
          </label>
          <div className="chip-row" aria-label="Occasion shortcuts">
            {occasions.slice(0, 5).map((item) => <button type="button" className={`chip ${occasion === item ? "selected" : ""}`} key={item} onClick={() => setOccasion(item)}>{item}</button>)}
          </div>
          <div className="weather-card">
            <CloudSun size={21} />
            <div><strong>{weather ? `${Math.round(weather.feelsLikeC)}C feels like` : "Check today’s weather"}</strong><span>{weather ? `${weather.location} · ${weather.condition}` : settings.location}</span></div>
            <button type="button" className="round-icon-button" onClick={handleWeather} disabled={busy} aria-label="Refresh weather"><RefreshCcw size={15} /></button>
          </div>
          <button className="primary-wide" onClick={handleRecommend} disabled={busy || wardrobe.length < 3}><Wand2 size={17} />{busy ? "Thinking..." : "Choose my outfit"}</button>
          {message && <p className="inline-status" role="status">{message}</p>}
        </section>
        <section className="answer-stage" aria-label="YiYi recommendation">
          {!outfits.length && <div className="answer-empty"><YiyiMark size={78} /><h2>Your answer will appear here.</h2><p>YiYi will work with what is already in your wardrobe.</p><div className="answer-line" /></div>}
          {outfits.map((outfit, index) => <article className="yi-outfit-card" key={outfit.id}>
            <header><div><p className="eyebrow">Today&apos;s answer</p><h2>I&apos;d wear this one.</h2></div><span>{index + 1} / {outfits.length}</span></header>
            <p className="outfit-reason">{outfit.reasons[0] ?? "Cool, considered, and ready for your day."}</p>
            <div className="yi-outfit-items">{outfit.itemIds.map((id) => { const item = itemsById.get(id); if (!item) return null; return <div className="yi-outfit-item" key={id}>{item.imagePreviewUrl ? <img src={item.imagePreviewUrl} alt={item.name} /> : <div className="image-placeholder" />}<span>{item.name}</span></div>; })}</div>
            <footer><span className="chip selected">{occasion}</span><span>{Math.round(outfit.score)} points</span></footer>
          </article>)}
        </section>
      </div>
      {preferenceTags.length > 0 && <div className="intent-strip"><span>YiYi remembers</span>{preferenceTags.slice(0, 8).map((tag) => <span className="chip" key={tag}>{tag}</span>)}</div>}
    </section>
  );
}
