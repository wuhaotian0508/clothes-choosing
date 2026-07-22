import type {
  AdminSummaryCounts,
  AdminUserData,
  AppRole,
  AppSettings,
  ClothesProfile,
  LikedOutfit,
  RecommendationRecord,
  WardrobeItem
} from "../types";
import { supabase } from "./supabaseClient";

type ProfilesPage = {
  profiles: ClothesProfile[];
  total: number;
};

type DataRow<T> = { data: T };

export async function listAdminProfiles({
  page = 0,
  pageSize = 50,
  query = ""
}: {
  page?: number;
  pageSize?: number;
  query?: string;
} = {}): Promise<ProfilesPage> {
  const client = await requireAdminClient();
  const start = page * pageSize;
  let request = client
    .from("clothes_profiles")
    .select("user_id, email, first_seen_at, last_seen_at", { count: "exact" })
    .order("last_seen_at", { ascending: false })
    .range(start, start + pageSize - 1);

  const normalizedQuery = query.trim();
  if (normalizedQuery) {
    request = request.ilike("email", `%${normalizedQuery}%`);
  }

  const { data, count, error } = await request;
  if (error) throw error;

  return {
    profiles: (data ?? []).map(mapProfile),
    total: count ?? 0
  };
}

export async function getAdminSummaryCounts(): Promise<AdminSummaryCounts> {
  const client = await requireAdminClient();
  const tables = [
    "clothes_profiles",
    "clothes_wardrobe_items",
    "clothes_liked_outfits",
    "clothes_recommendation_records"
  ] as const;

  const results = await Promise.all(
    tables.map((table) => client.from(table).select("*", { count: "exact", head: true }))
  );

  for (const result of results) {
    if (result.error) throw result.error;
  }

  return {
    users: results[0].count ?? 0,
    wardrobe: results[1].count ?? 0,
    likes: results[2].count ?? 0,
    recommendations: results[3].count ?? 0
  };
}

export async function getAdminUserData(userId: string): Promise<AdminUserData> {
  const client = await requireAdminClient();
  const [wardrobe, likes, recommendations, settings] = await Promise.all([
    client
      .from("clothes_wardrobe_items")
      .select("data")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    client
      .from("clothes_liked_outfits")
      .select("data")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    client
      .from("clothes_recommendation_records")
      .select("data")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    client.from("clothes_user_settings").select("data").eq("user_id", userId).maybeSingle()
  ]);

  for (const result of [wardrobe, likes, recommendations, settings]) {
    if (result.error) throw result.error;
  }

  return {
    wardrobe: ((wardrobe.data ?? []) as DataRow<WardrobeItem>[]).map((row) => row.data),
    likes: ((likes.data ?? []) as DataRow<LikedOutfit>[]).map((row) => row.data),
    recommendations: (
      (recommendations.data ?? []) as DataRow<RecommendationRecord>[]
    ).map((row) => row.data),
    settings: (settings.data?.data as AppSettings | undefined) ?? null
  };
}

async function requireAdminClient(): Promise<NonNullable<typeof supabase>> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Sign in before opening the admin dashboard");

  const { data: roleData, error: roleError } = await supabase
    .from("clothes_user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (roleError) throw roleError;
  const role: AppRole = roleData?.role === "admin" ? "admin" : "user";
  if (role !== "admin") throw new Error("Admin access required");

  return supabase;
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
