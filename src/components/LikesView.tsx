import { Heart, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import type { LikedOutfit } from "../types";
import { extractStyle } from "../lib/api";
import { deleteLikedOutfit, fileToDataUrl, saveLikedOutfit } from "../lib/storage";
import TagEditor from "./TagEditor";

export default function LikesView({
  likes,
  onChanged
}: {
  likes: LikedOutfit[];
  onChanged: () => Promise<void>;
}) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleImage(file?: File) {
    if (!file) return;
    setImagePreviewUrl(await fileToDataUrl(file));
  }

  async function handleExtract() {
    setBusy(true);
    setMessage("Reading style");
    try {
      const result = await extractStyle({ imageDataUrl: imagePreviewUrl, description });
      setStyleTags(result.styleTags ?? []);
      setNotes(result.notes ?? description);
      setMessage(result.modelUsed ? "Model style applied" : "Fallback style applied");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Style extraction failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    await saveLikedOutfit({
      id: crypto.randomUUID(),
      imagePreviewUrl,
      description,
      styleTags,
      notes,
      createdAt: new Date().toISOString()
    });
    setImagePreviewUrl(undefined);
    setDescription("");
    setStyleTags([]);
    setNotes("");
    setMessage("Saved");
    await onChanged();
  }

  async function handleDelete(id: string) {
    await deleteLikedOutfit(id);
    await onChanged();
  }

  return (
    <div className="view-grid">
      <section className="panel">
        <div className="panel-heading">
          <h2>Add style reference</h2>
          <span>{message}</span>
        </div>
        <label className="file-drop wide">
          {imagePreviewUrl ? <img src={imagePreviewUrl} alt="" /> : <Upload size={28} />}
          <input type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} />
        </label>
        <label className="field">
          <span>Note</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <TagEditor label="Style tags" value={styleTags} onChange={setStyleTags} />
        <label className="field">
          <span>Model notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="button-row">
          <button className="secondary" onClick={handleExtract} disabled={busy}>
            <Sparkles size={17} /> Extract style
          </button>
          <button onClick={handleSave}>
            <Save size={17} /> Save reference
          </button>
        </div>
      </section>

      <section className="item-grid">
        {likes.map((like) => (
          <article className="item-card" key={like.id}>
            {like.imagePreviewUrl ? <img src={like.imagePreviewUrl} alt="" /> : <div className="image-placeholder"><Heart size={24} /></div>}
            <div>
              <div className="card-title">
                <h3>{like.notes || like.description || "Style reference"}</h3>
                <button className="icon-button" onClick={() => handleDelete(like.id)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="tags">{like.styleTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
