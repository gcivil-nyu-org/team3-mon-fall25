import { useState } from "react";

export default function Filters({ initial = {}, onChange }) {
  const [filters, setFilters] = useState({
    categories: initial.categories || [],
    dorms: initial.dorms || [],
    priceMin: initial.priceMin || 0,
    priceMax: initial.priceMax || 2000,
    availableOnly: initial.availableOnly || false,
  });

  const handleCheckbox = (type, value) => {
    const current = filters[type] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const newFilters = { ...filters, [type]: updated };
    setFilters(newFilters);
    onChange?.(newFilters);
  };

  const handlePriceChange = (min, max) => {
    const newFilters = { ...filters, priceMin: min, priceMax: max };
    setFilters(newFilters);
    onChange?.(newFilters);
  };

  const handleToggle = () => {
    const newFilters = { ...filters, availableOnly: !filters.availableOnly };
    setFilters(newFilters);
    onChange?.(newFilters);
  };

  const categories = ["Electronics", "Books", "Furniture", "Sports", "Clothing", "Other"];
  const dorms = [
    "Othmer Hall",
    "Clark Hall",
    "Rubin Hall",
    "Weinstein Hall",
    "Brittany Hall",
    "Founders Hall",
  ];

  const resultCount = 18; // This should come from props in real app

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: 24,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      {/* Results count */}
      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        {resultCount} results
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Category
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {categories.map((cat) => (
            <label
              key={cat}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 15,
                color: "#374151",
              }}
            >
              <input
                type="checkbox"
                checked={filters.categories.includes(cat)}
                onChange={() => handleCheckbox("categories", cat)}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      {/* Dorm Filter */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Dorm
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dorms.map((dorm) => (
            <label
              key={dorm}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 15,
                color: "#374151",
              }}
            >
              <input
                type="checkbox"
                checked={filters.dorms.includes(dorm)}
                onChange={() => handleCheckbox("dorms", dorm)}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
              />
              {dorm}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Price Range
        </h4>
        <input
          type="range"
          min="0"
          max="2000"
          value={filters.priceMax}
          onChange={(e) => handlePriceChange(filters.priceMin, Number(e.target.value))}
          style={{
            width: "100%",
            accentColor: "#56018D",
            cursor: "pointer",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 14, color: "#6b7280" }}>
          <span>${filters.priceMin}</span>
          <span>${filters.priceMax}</span>
        </div>
      </div>

      {/* Available Only Toggle */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111" }}>
            Available Only
          </h4>
          <label style={{ position: "relative", display: "inline-block", width: 50, height: 26, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={filters.availableOnly}
              onChange={handleToggle}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: filters.availableOnly ? "#56018D" : "#cbd5e1",
              borderRadius: 26,
              transition: "0.3s",
            }}>
              <span style={{
                position: "absolute",
                height: 20,
                width: 20,
                left: filters.availableOnly ? 26 : 3,
                bottom: 3,
                background: "#fff",
                borderRadius: "50%",
                transition: "0.3s",
              }} />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
