import { CalendarDays, Heart, Settings, Shirt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LikesView from "./components/LikesView";
import SettingsView from "./components/SettingsView";
import TodayView from "./components/TodayView";
import WardrobeView from "./components/WardrobeView";
import type { AppSettings, LikedOutfit, RecommendationRecord, WardrobeItem } from "./types";
import { onCloudAuthChange } from "./lib/cloudAuth";
import {
  getSettings,
  listLikes,
  listRecommendations,
  listWardrobe,
  saveSettings,
  syncLocalToCloud
} from "./lib/storage";

type View = "today" | "wardrobe" | "likes" | "settings";

export default function App() {
  const [view, setView] = useState<View>("today");
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [likes, setLikes] = useState<LikedOutfit[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ location: "Los Angeles" });
  const [status, setStatus] = useState("Loading local wardrobe");

  const preferenceTags = useMemo(() => {
    return Array.from(new Set(likes.flatMap((like) => like.styleTags)));
  }, [likes]);

  useEffect(() => {
    refreshAll().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    return onCloudAuthChange(async (session) => {
      try {
        setStatus(session ? "Syncing cloud wardrobe" : "Using local wardrobe");
        if (session) {
          await syncLocalToCloud();
        }
        await refreshAll();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Cloud sync failed");
      }
    });
  }, []);

  async function refreshAll() {
    const [savedWardrobe, savedLikes, savedRecommendations, savedSettings] = await Promise.all([
      listWardrobe(),
      listLikes(),
      listRecommendations(),
      getSettings()
    ]);
    setWardrobe(savedWardrobe);
    setLikes(savedLikes);
    setRecommendations(savedRecommendations);
    setSettings(savedSettings);
    setStatus("Ready");
  }

  async function updateSettings(next: AppSettings) {
    await saveSettings(next);
    setSettings(next);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Local Outfit Assistant</p>
          <h1>Today&apos;s wardrobe</h1>
        </div>
        <nav className="nav-list">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>
            <CalendarDays size={18} /> Today
          </button>
          <button className={view === "wardrobe" ? "active" : ""} onClick={() => setView("wardrobe")}>
            <Shirt size={18} /> Wardrobe
          </button>
          <button className={view === "likes" ? "active" : ""} onClick={() => setView("likes")}>
            <Heart size={18} /> Style Likes
          </button>
          <button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>
            <Settings size={18} /> Settings
          </button>
        </nav>
        <div className="sidebar-stats">
          <span>{wardrobe.length} items</span>
          <span>{likes.length} references</span>
          <span>{recommendations.length} saved days</span>
        </div>
      </aside>

      <section className="workspace">
        <div className="topbar">
          <span>{status}</span>
          <span>{settings.location}</span>
        </div>
        {view === "today" && (
          <TodayView
            wardrobe={wardrobe}
            preferenceTags={preferenceTags}
            settings={settings}
            onSaved={refreshAll}
          />
        )}
        {view === "wardrobe" && <WardrobeView wardrobe={wardrobe} onChanged={refreshAll} />}
        {view === "likes" && <LikesView likes={likes} onChanged={refreshAll} />}
        {view === "settings" && (
          <SettingsView settings={settings} onSettingsChange={updateSettings} onChanged={refreshAll} />
        )}
      </section>
    </main>
  );
}
