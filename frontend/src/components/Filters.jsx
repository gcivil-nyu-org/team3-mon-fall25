import { useState } from "react";

export default function Filters({ initial = {}, onChange }) {
  const [filters, setFilters] = useState({
    category: initial.category || "",
    location: initial.location || "",
    dateRange: initial.dateRange || "",
    priceMin: initial.priceMin ?? "",
    priceMax: initial.priceMax ?? "",
    availableOnly: initial.availableOnly || false,
  });

  const update = (partial) => {
    const newFilters = { ...filters, ...partial };
    setFilters(newFilters);
    onChange?.(newFilters);
  };

  const handlePriceChange = (min, max) => {
    update({ priceMin: min, priceMax: max });
  };

  const handleToggle = () => {
    update({ availableOnly: !filters.availableOnly });
  };

  const handleReset = () => {
    const cleared = {
      category: "",
      location: "",
      dateRange: "",
      priceMin: "",
      priceMax: "",
      availableOnly: false,
    };
    setFilters(cleared);
    onChange?.(cleared);
  };
  const categories = ["Electronics", "Books", "Furniture", "Apparel", "Other"];
  const dateRanges = [
    { value: "24h", label: "Last 24 hours" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
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
      <button
          type="button"
          onClick={handleReset}
          style={{ fontSize: 12, color: "#56018D", background: "transparent", border: "none", cursor: "pointer" }}
        >
          Clear all
        </button>
      
      {/* Category Filter (single select) */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Category
        </h4>
        <div>
          <label style={{ position: "absolute", left: "-9999px" }} htmlFor="category-select">Category</label>
          <select
            id="category-select"
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              background: "#fff",
              fontSize: 14,
            }}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Location Keyword */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Location
        </h4>
        <label style={{ position: "absolute", left: "-9999px" }} htmlFor="location-input">Location</label>
        <input
          id="location-input"
          type="text"
          placeholder="Enter a location keyword (e.g., Brooklyn)"
          value={filters.location}
          onChange={(e) => update({ location: e.target.value })}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            background: "#fff",
            fontSize: 14,
          }}
        />
      </div>

      {/* Price Range */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Price Range
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ position: "absolute", left: "-9999px" }} htmlFor="price-min">Min price</label>
            <input
              id="price-min"
              type="number"
              inputMode="decimal"
              placeholder="Min"
              value={filters.priceMin}
              onChange={(e) => handlePriceChange(e.target.value, filters.priceMax)}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "8px 12px",
                background: "#fff",
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label style={{ position: "absolute", left: "-9999px" }} htmlFor="price-max">Max price</label>
            <input
              id="price-max"
              type="number"
              inputMode="decimal"
              placeholder="Max"
              value={filters.priceMax}
              onChange={(e) => handlePriceChange(filters.priceMin, e.target.value)}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "8px 12px",
                background: "#fff",
                fontSize: 14,
              }}
            />
          </div>
        </div>
      </div>

      {/* Date Posted */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Date Posted
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dateRanges.map((r) => (
            <label key={r.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 15, color: "#374151" }}>
              <input
                type="radio"
                name="date-range"
                value={r.value}
                checked={filters.dateRange === r.value}
                onChange={() => update({ dateRange: r.value })}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
              />
              {r.label}
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 15, color: "#374151" }}>
            <input
              type="radio"
              name="date-range"
              value=""
              checked={filters.dateRange === ""}
              onChange={() => update({ dateRange: "" })}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
            />
            Any time
          </label>
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
