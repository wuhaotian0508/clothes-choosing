import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Search,
  Settings,
  Shirt,
  Users
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type {
  AdminSummaryCounts,
  AdminUserData,
  ClothesProfile,
  LikedOutfit,
  RecommendationRecord,
  WardrobeItem
} from "../types";
import { getAdminSummaryCounts, getAdminUserData, listAdminProfiles } from "../lib/admin";

const PAGE_SIZE = 50;
type AdminTab = "wardrobe" | "likes" | "recommendations" | "settings";

export default function AdminView() {
  const [summary, setSummary] = useState<AdminSummaryCounts | null>(null);
  const [profiles, setProfiles] = useState<ClothesProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ClothesProfile | null>(null);
  const [userData, setUserData] = useState<AdminUserData | null>(null);
  const [tab, setTab] = useState<AdminTab>("wardrobe");
  const [message, setMessage] = useState("Loading admin data");

  useEffect(() => {
    let active = true;
    Promise.all([getAdminSummaryCounts(), listAdminProfiles({ page: 0, pageSize: PAGE_SIZE })])
      .then(([counts, result]) => {
        if (!active) return;
        setSummary(counts);
        setProfiles(result.profiles);
        setTotal(result.total);
        setMessage(result.total ? "Select a user" : "No outfit users yet");
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "Admin load failed");
      });

    return () => {
      active = false;
    };
  }, []);

  async function loadProfiles(nextPage: number, nextQuery: string) {
    setMessage("Loading users");
    const result = await listAdminProfiles({
      page: nextPage,
      pageSize: PAGE_SIZE,
      query: nextQuery
    });
    setPage(nextPage);
    setProfiles(result.profiles);
    setTotal(result.total);
    setMessage(result.total ? "Select a user" : "No matching users");
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await loadProfiles(0, query);
      setActiveQuery(query);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed");
    }
  }

  async function handlePageChange(nextPage: number) {
    try {
      await loadProfiles(nextPage, activeQuery);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change page");
    }
  }

  async function handleSelect(profile: ClothesProfile) {
    setSelectedProfile(profile);
    setUserData(null);
    setTab("wardrobe");
    setMessage(`Loading ${profile.email}`);
    try {
      const data = await getAdminUserData(profile.userId);
      setUserData(data);
      setMessage("Read-only admin view");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "User data failed to load");
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Administrator</p>
          <h2>Cloud activity</h2>
        </div>
        <span>{message}</span>
      </header>

      <section className="admin-summary" aria-label="Admin summary">
        <SummaryItem icon={<Users size={19} />} label="Users" value={summary?.users} />
        <SummaryItem icon={<Shirt size={19} />} label="Wardrobe" value={summary?.wardrobe} />
        <SummaryItem icon={<Heart size={19} />} label="Style likes" value={summary?.likes} />
        <SummaryItem
          icon={<CalendarDays size={19} />}
          label="Recommendations"
          value={summary?.recommendations}
        />
      </section>

      <div className="admin-layout">
        <aside className="admin-users" aria-label="Outfit users">
          <form className="admin-search" onSubmit={handleSearch}>
            <label className="field">
              <span>Search users</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Email"
              />
            </label>
            <button type="submit" className="secondary" aria-label="Search users" title="Search users">
              <Search size={17} />
            </button>
          </form>

          <div className="admin-user-list">
            {profiles.map((profile) => (
              <button
                type="button"
                className={selectedProfile?.userId === profile.userId ? "active" : ""}
                key={profile.userId}
                onClick={() => handleSelect(profile)}
              >
                <strong>{profile.email}</strong>
                <span>Active {formatDate(profile.lastSeenAt)}</span>
              </button>
            ))}
            {!profiles.length && <div className="admin-empty">No users found.</div>}
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="secondary icon-button neutral"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
              aria-label="Previous user page"
              title="Previous page"
            >
              <ChevronLeft size={17} />
            </button>
            <span>{page + 1} / {pageCount}</span>
            <button
              type="button"
              className="secondary icon-button neutral"
              onClick={() => handlePageChange(page + 1)}
              disabled={page + 1 >= pageCount}
              aria-label="Next user page"
              title="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </aside>

        <section className="admin-detail" aria-live="polite">
          {!selectedProfile && (
            <div className="admin-empty detail-empty">
              <Users size={28} />
              <span>Select a user to inspect their synced data.</span>
            </div>
          )}
          {selectedProfile && (
            <>
              <div className="admin-user-heading">
                <div>
                  <h2>{selectedProfile.email}</h2>
                  <span>Joined {formatDate(selectedProfile.firstSeenAt)}</span>
                </div>
                <span className="readonly-badge">Read only</span>
              </div>
              <div className="admin-tabs" role="tablist" aria-label="User data">
                <TabButton active={tab === "wardrobe"} onClick={() => setTab("wardrobe")} icon={<Shirt size={16} />} label="Wardrobe" />
                <TabButton active={tab === "likes"} onClick={() => setTab("likes")} icon={<Heart size={16} />} label="Style Likes" />
                <TabButton active={tab === "recommendations"} onClick={() => setTab("recommendations")} icon={<CalendarDays size={16} />} label="Recommendations" />
                <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={<Settings size={16} />} label="Settings" />
              </div>
              {!userData && <div className="admin-empty">Loading user data...</div>}
              {userData && tab === "wardrobe" && <WardrobeData items={userData.wardrobe} />}
              {userData && tab === "likes" && <LikesData items={userData.likes} />}
              {userData && tab === "recommendations" && <RecommendationData items={userData.recommendations} />}
              {userData && tab === "settings" && <SettingsData settings={userData.settings} />}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return (
    <div className="summary-item">
      {icon}
      <div>
        <strong>{value ?? "-"}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={onClick}>
      {icon} {label}
    </button>
  );
}

function WardrobeData({ items }: { items: WardrobeItem[] }) {
  if (!items.length) return <div className="admin-empty">No wardrobe items.</div>;
  return (
    <div className="item-grid">
      {items.map((item) => (
        <article className="item-card" key={item.id}>
          {item.imagePreviewUrl ? <img src={item.imagePreviewUrl} alt={item.name} /> : <div className="image-placeholder" />}
          <div>
            <h3>{item.name}</h3>
            <p>{item.category} · warmth {item.warmthLevel} · formality {item.formalityLevel}</p>
            <div className="tags">
              {[...item.colors, ...item.weatherTags, ...item.occasionTags, ...item.styleTags].map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function LikesData({ items }: { items: LikedOutfit[] }) {
  if (!items.length) return <div className="admin-empty">No style references.</div>;
  return (
    <div className="item-grid">
      {items.map((item) => (
        <article className="item-card" key={item.id}>
          {item.imagePreviewUrl ? <img src={item.imagePreviewUrl} alt={item.description || "Style reference"} /> : <div className="image-placeholder" />}
          <div>
            <h3>{item.description || "Style reference"}</h3>
            <p>{item.notes || "No notes"}</p>
            <div className="tags">{item.styleTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        </article>
      ))}
    </div>
  );
}

function RecommendationData({ items }: { items: RecommendationRecord[] }) {
  if (!items.length) return <div className="admin-empty">No saved recommendations.</div>;
  return (
    <div className="admin-record-list">
      {items.map((item) => (
        <article className="admin-record" key={item.id}>
          <div>
            <strong>{item.date}</strong>
            <span>{item.occasion}</span>
          </div>
          <div>
            <strong>{Math.round(item.weatherSnapshot.temperatureC)}°C</strong>
            <span>{item.weatherSnapshot.condition} · {item.weatherSnapshot.location}</span>
          </div>
          <div>
            <strong>{item.outfits.length}</strong>
            <span>saved outfits</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function SettingsData({ settings }: { settings: AdminUserData["settings"] }) {
  if (!settings) return <div className="admin-empty">No synced settings.</div>;
  return (
    <div className="admin-settings">
      <div className="sensitive-heading">
        <MapPin size={18} />
        <strong>Sensitive location data</strong>
      </div>
      <dl>
        <div><dt>Location</dt><dd>{settings.location}</dd></div>
        <div><dt>Current location mode</dt><dd>{settings.useCurrentLocation ? "Enabled" : "Disabled"}</dd></div>
        <div><dt>Latitude</dt><dd>{settings.latitude ?? "Not saved"}</dd></div>
        <div><dt>Longitude</dt><dd>{settings.longitude ?? "Not saved"}</dd></div>
      </dl>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
