import { Save, Sparkles, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import type { ClothingCategory, WardrobeItem } from "../types";
import { tagClothing } from "../lib/api";
import { deleteWardrobeItem, fileToDataUrl, saveWardrobeItem } from "../lib/storage";
import TagEditor from "./TagEditor";

const categories: ClothingCategory[] = ["top", "bottom", "shoes", "outerwear", "accessory", "onepiece"];

type Draft = {
  name: string;
  description: string;
  category: ClothingCategory;
  colors: string[];
  seasonTags: string[];
  weatherTags: string[];
  occasionTags: string[];
  styleTags: string[];
  warmthLevel: number;
  formalityLevel: number;
  imagePreviewUrl?: string;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  category: "top",
  colors: [],
  seasonTags: ["spring", "fall"],
  weatherTags: ["mild"],
  occasionTags: ["casual", "class"],
  styleTags: [],
  warmthLevel: 2,
  formalityLevel: 2
};

export default function WardrobeView({
  wardrobe,
  onChanged
}: {
  wardrobe: WardrobeItem[];
  onChanged: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleImage(file?: File) {
    if (!file) return;
    const imagePreviewUrl = await fileToDataUrl(file);
    setDraft((current) => ({ ...current, imagePreviewUrl }));
  }

  async function handleAutoTag() {
    setBusy(true);
    setMessage("Tagging item");
    try {
      const result = await tagClothing({
        imageDataUrl: draft.imagePreviewUrl,
        description: draft.description
      });
      setDraft((current) => ({
        ...current,
        name: result.name || current.name,
        category: result.category || current.category,
        colors: result.colors || current.colors,
        seasonTags: result.seasonTags || current.seasonTags,
        weatherTags: result.weatherTags || current.weatherTags,
        occasionTags: result.occasionTags || current.occasionTags,
        styleTags: result.styleTags || current.styleTags,
        warmthLevel: Number(result.warmthLevel ?? current.warmthLevel),
        formalityLevel: Number(result.formalityLevel ?? current.formalityLevel)
      }));
      setMessage(result.modelUsed ? "Model tags applied" : "Fallback tags applied");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tagging failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    const now = new Date().toISOString();
    const item: WardrobeItem = {
      id: crypto.randomUUID(),
      name: draft.name || draft.description || "Wardrobe item",
      imagePreviewUrl: draft.imagePreviewUrl,
      description: draft.description,
      category: draft.category,
      colors: draft.colors,
      seasonTags: draft.seasonTags,
      weatherTags: draft.weatherTags,
      occasionTags: draft.occasionTags,
      styleTags: draft.styleTags,
      warmthLevel: draft.warmthLevel,
      formalityLevel: draft.formalityLevel,
      createdAt: now,
      updatedAt: now
    };
    await saveWardrobeItem(item);
    setDraft(emptyDraft);
    setMessage("Saved");
    await onChanged();
  }

  async function handleDelete(id: string) {
    await deleteWardrobeItem(id);
    await onChanged();
  }

  return (
    <div className="view-grid">
      <section className="panel">
        <div className="panel-heading">
          <h2>Add wardrobe item</h2>
          <span>{message}</span>
        </div>
        <div className="form-grid">
          <label className="file-drop">
            {draft.imagePreviewUrl ? <img src={draft.imagePreviewUrl} alt="" /> : <Upload size={28} />}
            <input type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} />
          </label>
          <div className="stack">
            <label className="field">
              <span>Name</span>
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="navy knit shirt, clean, class"
              />
            </label>
          </div>
        </div>
        <div className="compact-grid">
          <label className="field">
            <span>Category</span>
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value as ClothingCategory })}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Warmth</span>
            <input
              type="number"
              min="1"
              max="5"
              value={draft.warmthLevel}
              onChange={(event) => setDraft({ ...draft, warmthLevel: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Formality</span>
            <input
              type="number"
              min="1"
              max="5"
              value={draft.formalityLevel}
              onChange={(event) => setDraft({ ...draft, formalityLevel: Number(event.target.value) })}
            />
          </label>
        </div>
        <TagEditor label="Colors" value={draft.colors} onChange={(colors) => setDraft({ ...draft, colors })} />
        <TagEditor label="Weather tags" value={draft.weatherTags} onChange={(weatherTags) => setDraft({ ...draft, weatherTags })} />
        <TagEditor label="Occasion tags" value={draft.occasionTags} onChange={(occasionTags) => setDraft({ ...draft, occasionTags })} />
        <TagEditor label="Style tags" value={draft.styleTags} onChange={(styleTags) => setDraft({ ...draft, styleTags })} />
        <div className="button-row">
          <button className="secondary" onClick={handleAutoTag} disabled={busy}>
            <Sparkles size={17} /> Auto tag
          </button>
          <button onClick={handleSave}>
            <Save size={17} /> Save item
          </button>
        </div>
      </section>

      <section className="item-grid">
        {wardrobe.map((item) => (
          <article className="item-card" key={item.id}>
            {item.imagePreviewUrl ? <img src={item.imagePreviewUrl} alt="" /> : <div className="image-placeholder" />}
            <div>
              <div className="card-title">
                <h3>{item.name}</h3>
                <button className="icon-button" onClick={() => handleDelete(item.id)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
              <p>{item.category}</p>
              <div className="tags">{[...item.colors, ...item.weatherTags, ...item.occasionTags, ...item.styleTags].map((tag) => <span key={tag}>{tag}</span>)}</div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
