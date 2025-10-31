import React from "react";

export default function SortSelect({ value, onChange }) {
  return (
    <div style={{ minWidth: 200 }}>
      <label style={{ position: "absolute", left: "-9999px" }} htmlFor="sort">
        Sort
      </label>
      <select
        id="sort"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          padding: "8px 12px",
          background: "#fff",
          fontSize: 14,
        }}
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="price_asc">Price: Low → High</option>
        <option value="price_desc">Price: High → Low</option>
        <option value="title_asc">Title: A → Z</option>
        <option value="title_desc">Title: Z → A</option>
      </select>
    </div>
  );
}
