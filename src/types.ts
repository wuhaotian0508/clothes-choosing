export type ClothingCategory =
  | "top"
  | "bottom"
  | "shoes"
  | "outerwear"
  | "accessory"
  | "onepiece";

export type Occasion =
  | "class"
  | "commute"
  | "date"
  | "sport"
  | "casual"
  | "formal"
  | "travel";

export type WeatherSnapshot = {
  location: string;
  temperatureC: number;
  feelsLikeC: number;
  precipitationMm: number;
  windKph: number;
  condition: string;
};

export type WardrobeItem = {
  id: string;
  name: string;
  imageBlobId?: string;
  imagePreviewUrl?: string;
  description?: string;
  category: ClothingCategory;
  colors: string[];
  seasonTags: string[];
  weatherTags: string[];
  occasionTags: string[];
  styleTags: string[];
  warmthLevel: number;
  formalityLevel: number;
  createdAt: string;
  updatedAt: string;
};

export type LikedOutfit = {
  id: string;
  imageBlobId?: string;
  imagePreviewUrl?: string;
  description?: string;
  styleTags: string[];
  notes?: string;
  createdAt: string;
};

export type OutfitCandidate = {
  id: string;
  itemIds: string[];
  score: number;
  reasons: string[];
  warnings: string[];
};

export type RecommendationRecord = {
  id: string;
  date: string;
  occasion: Occasion;
  weatherSnapshot: WeatherSnapshot;
  outfits: OutfitCandidate[];
  createdAt: string;
};

export type AppSettings = {
  location: string;
  latitude?: number;
  longitude?: number;
  useCurrentLocation?: boolean;
};
