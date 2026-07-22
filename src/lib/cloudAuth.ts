import type { Session } from "@supabase/supabase-js";
import type { AppRole, ClothesProfile } from "../types";
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

export async function ensureClothesProfile(): Promise<ClothesProfile | null> {
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user?.email) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("clothes_profiles")
    .upsert(
      {
        user_id: userData.user.id,
        email: userData.user.email,
        last_seen_at: now
      },
      { onConflict: "user_id" }
    )
    .select("user_id, email, first_seen_at, last_seen_at")
    .single();

  if (error) throw error;
  return mapProfile(data);
}

export async function getCurrentAppRole(): Promise<AppRole> {
  if (!supabase) return "user";

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return "user";

  const { data, error } = await supabase
    .from("clothes_user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.role === "admin" ? "admin" : "user";
}

export function getCloudConfigStatus() {
  return isSupabaseConfigured ? "configured" : "missing";
}

function mapProfile(row: {
  user_id: string;
  email: string;
  first_seen_at: string;
  last_seen_at: string;
}): ClothesProfile {
  return {
    userId: row.user_id,
    email: row.email,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  };
}
