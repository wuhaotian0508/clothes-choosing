import { Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { getCloudConfigStatus, sendMagicLink } from "../lib/cloudAuth";

export default function AuthGate() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = getCloudConfigStatus() === "configured";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Sending secure login link");

    try {
      await sendMagicLink(email.trim());
      setMessage("Check your email and open the login link in this browser");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send login link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-heading">
          <ShieldCheck size={28} />
          <div>
            <p className="eyebrow">Local Outfit Assistant</p>
            <h1 id="auth-title">Sign in to your wardrobe</h1>
          </div>
        </div>
        <p className="auth-copy">
          We use a one-time email link so your wardrobe stays available across browsers.
        </p>
        <div className="privacy-notice">
          <strong>Cloud privacy notice</strong>
          <span>
            Uploaded photos, style references, recommendation history, and saved precise location
            can be viewed by this site&apos;s administrator.
          </span>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={!configured || busy}
            />
          </label>
          <button type="submit" disabled={!configured || busy || !email.trim()}>
            <Mail size={17} /> Send login link
          </button>
        </form>
        {!configured && <p className="auth-error">Cloud login is not configured for this deployment.</p>}
        {message && <p className="auth-message" role="status">{message}</p>}
      </section>
    </main>
  );
}
