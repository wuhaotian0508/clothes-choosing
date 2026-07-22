import { Plus, Save, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ClothingCategory, WardrobeItem } from "../types";
import { tagClothing } from "../lib/api";
import { deleteWardrobeItem, fileToDataUrl, saveWardrobeItem } from "../lib/storage";
import TagEditor from "./TagEditor";

const categories: ClothingCategory[] = ["top", "bottom", "shoes", "outerwear", "accessory", "onepiece"];
const filters = ["All", "Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"] as const;
type Draft = { name: string; description: string; category: ClothingCategory; colors: string[]; seasonTags: string[]; weatherTags: string[]; occasionTags: string[]; styleTags: string[]; warmthLevel: number; formalityLevel: number; imagePreviewUrl?: string };
const emptyDraft: Draft = { name: "", description: "", category: "top", colors: [], seasonTags: ["spring", "fall"], weatherTags: ["mild"], occasionTags: ["casual", "class"], styleTags: [], warmthLevel: 2, formalityLevel: 2 };

export default function WardrobeView({ wardrobe, onChanged }: { wardrobe: WardrobeItem[]; onChanged: () => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const shown = useMemo(() => wardrobe.filter((item) => {
    const categoryMatch = filter === "All" || (filter === "Accessories" ? item.category === "accessory" : filter.toLowerCase().replace(/s$/, "") === item.category);
    const text = `${item.name} ${item.description ?? ""} ${item.colors.join(" ")} ${item.styleTags.join(" ")}`.toLowerCase();
    return categoryMatch && (!query.trim() || text.includes(query.trim().toLowerCase()));
  }), [filter, query, wardrobe]);

  async function handleImage(file?: File) {
    if (!file) return;
    const imagePreviewUrl = await fileToDataUrl(file);
    setDraft((current) => ({ ...current, imagePreviewUrl }));
  }
  async function handleAutoTag() {
    setBusy(true); setMessage("Reading the item");
    try { const result = await tagClothing({ imageDataUrl: draft.imagePreviewUrl, description: draft.description }); setDraft((current) => ({ ...current, name: result.name || current.name, category: result.category || current.category, colors: result.colors || current.colors, seasonTags: result.seasonTags || current.seasonTags, weatherTags: result.weatherTags || current.weatherTags, occasionTags: result.occasionTags || current.occasionTags, styleTags: result.styleTags || current.styleTags, warmthLevel: Number(result.warmthLevel ?? current.warmthLevel), formalityLevel: Number(result.formalityLevel ?? current.formalityLevel) })); setMessage("Details ready to review"); } catch (error) { setMessage(error instanceof Error ? error.message : "Tagging failed"); } finally { setBusy(false); }
  }
  async function handleSave() { const now = new Date().toISOString(); await saveWardrobeItem({ id: crypto.randomUUID(), name: draft.name || draft.description || "Wardrobe item", imagePreviewUrl: draft.imagePreviewUrl, description: draft.description, category: draft.category, colors: draft.colors, seasonTags: draft.seasonTags, weatherTags: draft.weatherTags, occasionTags: draft.occasionTags, styleTags: draft.styleTags, warmthLevel: draft.warmthLevel, formalityLevel: draft.formalityLevel, createdAt: now, updatedAt: now }); setDraft(emptyDraft); setMessage("Added to wardrobe"); setShowAdd(false); await onChanged(); }
  async function handleDelete(id: string) { await deleteWardrobeItem(id); await onChanged(); }

  return <section className="wardrobe-page" aria-label="Wardrobe">
    <header className="page-intro wardrobe-intro"><div><p className="eyebrow">Your closet</p><h1>My wardrobe</h1></div><div className="wardrobe-actions"><label className="search-field"><Search size={16} /><input aria-label="Search wardrobe" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search color or item" /></label><button className="round-icon-button" onClick={() => setShowAdd(true)} aria-label="Add wardrobe item"><Plus size={19} /></button></div></header>
    <div className="filter-rail" aria-label="Wardrobe filters">{filters.map((item) => <button type="button" className={`chip ${filter === item ? "selected" : ""}`} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {shown.length ? <div className="yi-wardrobe-grid">{shown.map((item) => <article className="yi-garment-card" key={item.id}>{item.imagePreviewUrl ? <img src={item.imagePreviewUrl} alt={item.name} /> : <div className="garment-placeholder" />}<div className="garment-info"><div><strong>{item.name}</strong><span>{item.category}</span></div><button className="tiny-delete" onClick={() => handleDelete(item.id)} aria-label={`Delete ${item.name}`}><Trash2 size={14} /></button></div><div className="tags">{[...item.colors, ...item.styleTags].slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div> : <div className="wardrobe-empty"><Upload size={28} /><h2>{query ? "No matching items" : "Your wardrobe is empty"}</h2><p>Add a few tops, bottoms, shoes, and accessories so YiYi can style them for you.</p><button onClick={() => setShowAdd(true)}><Plus size={16} /> Add items</button></div>}
    <p className="item-count">{shown.length} items</p>
    {showAdd && <div className="add-sheet-backdrop" role="presentation" onClick={() => setShowAdd(false)}><section className="add-sheet" role="dialog" aria-modal="true" aria-labelledby="add-wardrobe-title" onClick={(event) => event.stopPropagation()}><header><div><p className="eyebrow">One item at a time</p><h2 id="add-wardrobe-title">Add to wardrobe</h2></div><button className="round-icon-button" onClick={() => setShowAdd(false)} aria-label="Close add item"><X size={17} /></button></header><div className="form-grid"><label className="file-drop">{draft.imagePreviewUrl ? <img src={draft.imagePreviewUrl} alt="" /> : <Upload size={25} />}<input type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} /></label><div className="stack"><label className="field"><span>Name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Brown jacket" /></label><label className="field"><span>Describe it</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Relaxed cotton jacket for cool days" /></label></div></div><div className="compact-grid"><label className="field"><span>Category</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ClothingCategory })}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label className="field"><span>Warmth</span><input type="number" min="1" max="5" value={draft.warmthLevel} onChange={(event) => setDraft({ ...draft, warmthLevel: Number(event.target.value) })} /></label><label className="field"><span>Formality</span><input type="number" min="1" max="5" value={draft.formalityLevel} onChange={(event) => setDraft({ ...draft, formalityLevel: Number(event.target.value) })} /></label></div><TagEditor label="Colors" value={draft.colors} onChange={(colors) => setDraft({ ...draft, colors })} /><TagEditor label="Style tags" value={draft.styleTags} onChange={(styleTags) => setDraft({ ...draft, styleTags })} /><div className="button-row"><button className="secondary" onClick={handleAutoTag} disabled={busy}><Sparkles size={16} /> Auto tag</button><button onClick={handleSave} disabled={busy}><Save size={16} /> Add to wardrobe</button></div>{message && <p className="inline-status" role="status">{message}</p>}</section></div>}
  </section>;
}
