import { Cloud, Crosshair, Download, LogOut, Mail, Save, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { AppRole, AppSettings } from "../types";
import { getCloudConfigStatus, sendMagicLink, signOutCloud } from "../lib/cloudAuth";
import { downloadJson, exportBackup, importBackup, syncLocalToCloud } from "../lib/storage";

export default function SettingsView({
  settings,
  sessionEmail,
  role,
  onSettingsChange,
  onChanged,
  onOpenAdmin
}: {
  settings: AppSettings;
  sessionEmail: string | null;
  role: AppRole;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
  onChanged: () => Promise<void>;
  onOpenAdmin: () => void;
}) {
  const [location, setLocation] = useState(settings.location);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [cloudMessage, setCloudMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const cloudConfigured = getCloudConfigStatus() === "configured";

  async function handleSave() {
    await onSettingsChange({ location, useCurrentLocation: false });
    setMessage("Saved");
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported in this browser");
      return;
    }

    setMessage("Requesting location permission");
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10 * 60 * 1000
        });
      });
      const next = {
        location: "Current location",
        latitude: Number(position.coords.latitude.toFixed(5)),
        longitude: Number(position.coords.longitude.toFixed(5)),
        useCurrentLocation: true
      };
      setLocation(next.location);
      await onSettingsChange(next);
      setMessage(`Saved current location: ${next.latitude}, ${next.longitude}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Location permission failed");
    }
  }

  async function handleExport() {
    const backup = await exportBackup();
    downloadJson(`outfit-assistant-backup-${backup.exportedAt.slice(0, 10)}.json`, backup);
    setMessage("Exported");
  }

  async function handleImport(file?: File) {
    if (!file) return;
    const text = await file.text();
    await importBackup(JSON.parse(text));
    await onChanged();
    setMessage("Imported");
  }

  async function handleSendMagicLink() {
    setCloudMessage("Sending login link");
    try {
      await sendMagicLink(email);
      setCloudMessage("Check your email for the login link");
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : "Login link failed");
    }
  }

  async function handleSignOut() {
    await signOutCloud();
    setCloudMessage("Signed out");
    await onChanged();
  }

  async function handleCloudSync() {
    setCloudMessage("Syncing local data to cloud");
    try {
      const result = await syncLocalToCloud();
      await onChanged();
      setCloudMessage(
        `Synced ${result.wardrobe} items, ${result.likes} references, ${result.recommendations} days`
      );
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : "Cloud sync failed");
    }
  }

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <h2>Settings</h2>
        <span>{message}</span>
      </div>
      <section className="cloud-account-card" aria-labelledby="cloud-account-title">
        <div className="cloud-account-heading">
          <div>
            <strong id="cloud-account-title">Cloud account</strong>
            <span>
              {sessionEmail
                ? `Signed in as ${sessionEmail}`
                : "Optional sign-in for cloud sync and administrator access"}
            </span>
          </div>
          {role === "admin" && <span className="admin-access-badge">Administrator</span>}
        </div>
        {!sessionEmail && (
          <div className="cloud-auth-row signed-out-cloud-row">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={!cloudConfigured}
              />
            </label>
            <button
              className="secondary"
              onClick={handleSendMagicLink}
              disabled={!cloudConfigured || !email.trim()}
            >
              <Mail size={17} /> Send login link
            </button>
          </div>
        )}
        {sessionEmail && (
          <div className="button-row cloud-account-actions">
            {role === "admin" && (
              <button onClick={onOpenAdmin}>Open Admin dashboard</button>
            )}
            <button className="secondary" onClick={handleCloudSync}>
              <Cloud size={17} /> Sync now
            </button>
            <button className="secondary" onClick={handleSignOut}>
              <LogOut size={17} /> Sign out
            </button>
          </div>
        )}
        {!cloudConfigured && <span className="auth-error">Cloud login is not configured.</span>}
        <div className="privacy-notice compact-privacy-notice">
          <strong>Cloud privacy notice</strong>
          <span>
            Synced photos, style references, recommendation history, and saved precise location can
            be viewed by this site&apos;s administrator.
          </span>
        </div>
        {cloudMessage && <div className="settings-note compact-note">{cloudMessage}</div>}
      </section>
      <label className="field">
        <span>Weather location</span>
        <input value={location} onChange={(event) => setLocation(event.target.value)} />
      </label>
      <div className="button-row">
        <button className="secondary" onClick={handleUseCurrentLocation}>
          <Crosshair size={17} /> Use current location
        </button>
        <button onClick={handleSave}>
          <Save size={17} /> Save
        </button>
        <button className="secondary" onClick={handleExport}>
          <Download size={17} /> Export
        </button>
        <button className="secondary" onClick={() => importRef.current?.click()}>
          <Upload size={17} /> Import
        </button>
      </div>
      <input
        ref={importRef}
        className="hidden"
        type="file"
        accept="application/json"
        onChange={(event) => handleImport(event.target.files?.[0])}
      />
      <div className="settings-note">
        <strong>Weather source</strong>
        <span>
          {settings.useCurrentLocation && settings.latitude != null && settings.longitude != null
            ? `Browser geolocation: ${settings.latitude}, ${settings.longitude}`
            : "Manual city name"}
        </span>
      </div>
    </section>
  );
}
