type TagEditorProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
};

export default function TagEditor({ label, value, onChange, placeholder }: TagEditorProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value.join(", ")}
        onChange={(event) => onChange(splitTags(event.target.value))}
        placeholder={placeholder}
      />
    </label>
  );
}

function splitTags(value: string) {
  return value
    .split(/[,，]/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}
