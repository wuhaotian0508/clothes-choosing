import type { AppSettings, LikedOutfit, RecommendationRecord, WardrobeItem } from "../types";
import { supabase } from "./supabaseClient";

const DB_NAME = "local-outfit-assistant";
const DB_VERSION = 1;
const DEFAULT_SETTINGS: AppSettings = { location: "Los Angeles" };

type StoreName = "wardrobe" | "likes" | "recommendations" | "settings";
type RemoteTableName =
  | "clothes_wardrobe_items"
  | "clothes_liked_outfits"
  | "clothes_recommendation_records";

type RemoteRow<T> = {
  data: T;
};

type BackupData = {
  version: 1;
  exportedAt: string;
  wardrobe: WardrobeItem[];
  likes: LikedOutfit[];
  recommendations: RecommendationRecord[];
  settings: AppSettings;
};

export async function listWardrobe() {
  return listRemoteOrLocal<WardrobeItem>("clothes_wardrobe_items", "wardrobe");
}

export async function saveWardrobeItem(item: WardrobeItem) {
  await put("wardrobe", item);
  await upsertRemote("clothes_wardrobe_items", item);
}

export async function deleteWardrobeItem(id: string) {
  await remove("wardrobe", id);
  await deleteRemote("clothes_wardrobe_items", id);
}

export async function listLikes() {
  return listRemoteOrLocal<LikedOutfit>("clothes_liked_outfits", "likes");
}

export async function saveLikedOutfit(item: LikedOutfit) {
  await put("likes", item);
  await upsertRemote("clothes_liked_outfits", item);
}

export async function deleteLikedOutfit(id: string) {
  await remove("likes", id);
  await deleteRemote("clothes_liked_outfits", id);
}

export async function listRecommendations() {
  return listRemoteOrLocal<RecommendationRecord>(
    "clothes_recommendation_records",
    "recommendations"
  );
}

export async function saveRecommendation(record: RecommendationRecord) {
  await put("recommendations", record);
  await upsertRemote("clothes_recommendation_records", record);
}

export async function getSettings(): Promise<AppSettings> {
  const local = await get<AppSettings>("settings", "app");
  const cloud = await getCloudUser();

  if (!cloud) {
    return local ?? DEFAULT_SETTINGS;
  }

  const { data, error } = await cloud.client
    .from("clothes_user_settings")
    .select("data")
    .eq("user_id", cloud.userId)
    .maybeSingle();

  if (error) {
    console.warn("Falling back to local settings", error.message);
    return local ?? DEFAULT_SETTINGS;
  }

  const remote = data?.data as AppSettings | undefined;
  if (remote) {
    await put("settings", { ...remote, id: "app" });
  }

  return remote ?? local ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings) {
  await put("settings", { ...settings, id: "app" });

  const cloud = await getCloudUser();
  if (!cloud) return;

  const { error } = await cloud.client.from("clothes_user_settings").upsert({
    user_id: cloud.userId,
    data: settings,
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
}

export async function exportBackup(): Promise<BackupData> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    wardrobe: await listWardrobe(),
    likes: await listLikes(),
    recommendations: await listRecommendations(),
    settings: await getSettings()
  };
}

export async function importBackup(data: BackupData) {
  if (data.version !== 1) {
    throw new Error("Unsupported backup version");
  }

  await clear("wardrobe");
  await clear("likes");
  await clear("recommendations");

  await Promise.all(data.wardrobe.map(saveWardrobeItem));
  await Promise.all(data.likes.map(saveLikedOutfit));
  await Promise.all(data.recommendations.map(saveRecommendation));
  await saveSettings(data.settings);
}

export async function syncLocalToCloud() {
  const cloud = await getCloudUser();
  if (!cloud) {
    throw new Error("Sign in before syncing to cloud");
  }

  const [wardrobe, likes, recommendations, settings] = await Promise.all([
    getAll<WardrobeItem>("wardrobe"),
    getAll<LikedOutfit>("likes"),
    getAll<RecommendationRecord>("recommendations"),
    get<AppSettings>("settings", "app")
  ]);

  await Promise.all([
    ...wardrobe.map((item) => upsertRemote("clothes_wardrobe_items", item, cloud)),
    ...likes.map((item) => upsertRemote("clothes_liked_outfits", item, cloud)),
    ...recommendations.map((record) =>
      upsertRemote("clothes_recommendation_records", record, cloud)
    )
  ]);

  if (settings) {
    await saveSettings(settings);
  }

  return {
    wardrobe: wardrobe.length,
    likes: likes.length,
    recommendations: recommendations.length,
    settings: Boolean(settings)
  };
}

async function listRemoteOrLocal<T extends { id: string }>(
  tableName: RemoteTableName,
  storeName: StoreName
): Promise<T[]> {
  const cloud = await getCloudUser();

  if (!cloud) {
    return getAll<T>(storeName);
  }

  const { data, error } = await cloud.client
    .from(tableName)
    .select("data")
    .eq("user_id", cloud.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn(`Falling back to local ${storeName}`, error.message);
    return getAll<T>(storeName);
  }

  const records = (data as RemoteRow<T>[]).map((row) => row.data);
  await Promise.all(records.map((record) => put(storeName, record)));
  return records;
}

async function upsertRemote<T extends { id: string }>(
  tableName: RemoteTableName,
  value: T,
  existingCloud?: CloudUser
) {
  const cloud = existingCloud ?? (await getCloudUser());
  if (!cloud) return;

  const { error } = await cloud.client.from(tableName).upsert({
    id: value.id,
    user_id: cloud.userId,
    data: value,
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
}

async function deleteRemote(tableName: RemoteTableName, id: string) {
  const cloud = await getCloudUser();
  if (!cloud) return;

  const { error } = await cloud.client.from(tableName).delete().eq("id", id);
  if (error) throw error;
}

type CloudUser = {
  client: NonNullable<typeof supabase>;
  userId: string;
};

async function getCloudUser(): Promise<CloudUser | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return {
    client: supabase,
    userId: data.user.id
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ["wardrobe", "likes", "recommendations"]) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDb();
  return transaction<T[]>(db, storeName, "readonly", (store) => store.getAll());
}

async function get<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDb();
  return transaction<T | undefined>(db, storeName, "readonly", (store) => store.get(id));
}

async function put<T extends { id: string }>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDb();
  await transaction(db, storeName, "readwrite", (store) => store.put(value));
}

async function remove(storeName: StoreName, id: string): Promise<void> {
  const db = await openDb();
  await transaction(db, storeName, "readwrite", (store) => store.delete(id));
}

async function clear(storeName: StoreName): Promise<void> {
  const db = await openDb();
  await transaction(db, storeName, "readwrite", (store) => store.clear());
}

function transaction<T>(
  db: IDBDatabase,
  storeName: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = action(store);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
