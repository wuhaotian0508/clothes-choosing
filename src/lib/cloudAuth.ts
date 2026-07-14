import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export async function getCloudSession(): Promise<Session | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onCloudAuthChange(callback: (session: Session | null) => void | Promise<void>) {
  if (!supabase) return () => undefined;

  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((_event, session) => {
    void callback(session);
  });

  return () => subscription.unsubscribe();
}

export async function sendMagicLink(email: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
      shouldCreateUser: true
    }
  });

  if (error) throw error;
}

export async function signOutCloud() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function getCloudConfigStatus() {
  return isSupabaseConfigured ? "configured" : "missing";
}

