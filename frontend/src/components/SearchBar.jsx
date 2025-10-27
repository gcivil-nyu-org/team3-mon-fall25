import { useState } from "react";

export default function SearchBar({ defaultValue = "", onSearch, placeholder = "Search…" }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div style={{
      display: "flex", gap: 8, border: "1px solid #e5e7eb",
      borderRadius: 16, padding: "8px 12px", background: "#fff"
    }}>
      <input
        style={{ flex: 1, border: "none", outline: "none", fontSize: 14 }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch?.(value)}
      />
      <button
        onClick={() => onSearch?.(value)}
        style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "6px 10px", background: "#fff" }}
      >
        Search
      </button>
    </div>
  );
}
