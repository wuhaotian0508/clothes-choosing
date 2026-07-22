import type { Session } from "@supabase/supabase-js";
import { CalendarDays, Heart, Settings, ShieldCheck, Shirt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminView from "./components/AdminView";
import AuthGate from "./components/AuthGate";
import LikesView from "./components/LikesView";
import SettingsView from "./components/SettingsView";
import TodayView from "./components/TodayView";
import WardrobeView from "./components/WardrobeView";
import type { AppRole, AppSettings, LikedOutfit, RecommendationRecord, WardrobeItem } from "./types";
import {
  ensureClothesProfile,
  getCloudSession,
  getCurrentAppRole,
  onCloudAuthChange
} from "./lib/cloudAuth";
import {
  getSettings,
  listLikes,
  listRecommendations,
  listWardrobe,
  saveSettings,
  syncLocalToCloud
} from "./lib/storage";

type View = "today" | "wardrobe" | "likes" | "settings" | "admin";

const requireAuth = import.meta.env.VITE_REQUIRE_AUTH === "true";

export default function App() {
  const [view, setView] = useState<View>("today");
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [likes, setLikes] = useState<LikedOutfit[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ location: "Los Angeles" });
  const [status, setStatus] = useState("Loading local wardrobe");
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<AppRole>("user");

  const preferenceTags = useMemo(() => {
    return Array.from(new Set(likes.flatMap((like) => like.styleTags)));
  }, [likes]);

  useEffect(() => {
    let active = true;
    let processedUserId: string | null | undefined;

    async function refreshAccess() {
      try {
        const currentSession = await getCloudSession();
        if (!active) return;

        setSession(currentSession);
        setAuthReady(true);
        const nextRole = currentSession ? await getCurrentAppRole() : "user";
        if (active) setRole(nextRole);
      } catch (error) {
        if (!active) return;
        setStatus(error instanceof Error ? error.message : "Could not refresh cloud access");
      }
    }

    async function applySession(nextSession: Session | null) {
      const nextUserId = nextSession?.user.id ?? null;
      if (!active || processedUserId === nextUserId) return;
      processedUserId = nextUserId;

      setSession(nextSession);
      setAuthReady(true);
      try {
        setStatus(nextSession ? "Syncing cloud wardrobe" : "Using local wardrobe");
        if (nextSession) {
          const nextRole = await getCurrentAppRole();
          if (active) setRole(nextRole);
          await ensureClothesProfile();
          await syncLocalToCloud();
        } else {
          setRole("user");
        }
        await refreshAll();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Cloud sync failed");
      }
    }

    getCloudSession()
      .then(applySession)
      .catch((error) => {
        if (!active) return;
        setAuthReady(true);
        setStatus(error instanceof Error ? error.message : "Cloud login failed");
      });
    const unsubscribe = onCloudAuthChange(applySession);
    const handleFocus = () => void refreshAccess();
    const handleVisibilityChange = () => {
      if (!document.hidden) void refreshAccess();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (view === "admin" && role !== "admin") setView("today");
  }, [role, view]);

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

  if (requireAuth && !authReady) {
    return <main className="auth-shell"><div className="auth-loading">Checking cloud session...</div></main>;
  }

  if (requireAuth && !session) {
    return <AuthGate />;
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
            <Settings size={18} /> {session ? "Settings" : "Settings & Login"}
          </button>
          {role === "admin" && (
            <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
              <ShieldCheck size={18} /> Admin
            </button>
          )}
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
          <SettingsView
            settings={settings}
            sessionEmail={session?.user.email ?? null}
            role={role}
            onSettingsChange={updateSettings}
            onChanged={refreshAll}
            onOpenAdmin={() => setView("admin")}
          />
        )}
        {view === "admin" && role === "admin" && <AdminView />}
      </section>
    </main>
  );
}
