import { useState, useEffect } from "react";

// Custom hook for debouncing values
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up a timer to update debouncedValue after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: clear the timer if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

const PRICE_DEBOUNCE_DELAY = 300;

export default function Filters({ initial = {}, onChange }) {
  const [filters, setFilters] = useState({
    categories: initial.categories || [],
    dorms: initial.dorms || [],
    priceMin: initial.priceMin ?? "",
    priceMax: initial.priceMax ?? "",
    availableOnly: initial.availableOnly || false,
  });

  // Local state for immediate UI updates (not debounced)
const [priceMinInput, setPriceMinInput] = useState(filters.priceMin);
const [priceMaxInput, setPriceMaxInput] = useState(filters.priceMax);

// Debounced values that trigger onChange callback
const debouncedPriceMin = useDebounce(priceMinInput, PRICE_DEBOUNCE_DELAY);
const debouncedPriceMax = useDebounce(priceMaxInput, PRICE_DEBOUNCE_DELAY);

// Update filters when debounced values change and trigger onChange
useEffect(() => {
  setFilters(prev => {
    const newFilters = {
      ...prev,
      priceMin: debouncedPriceMin,
      priceMax: debouncedPriceMax,
    };
    // Trigger onChange with the new filters
    onChange?.(newFilters);
    return newFilters;
  });
}, [debouncedPriceMin, debouncedPriceMax]); // Only trigger when debounced values change

// Sync input state when initial props change (e.g., from URL)
useEffect(() => {
  setPriceMinInput(initial.priceMin ?? "");
  setPriceMaxInput(initial.priceMax ?? "");
}, [initial.priceMin, initial.priceMax]);


  const handleCheckbox = (type, value) => {
    const current = filters[type] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const newFilters = { ...filters, [type]: updated };
    setFilters(newFilters);
    onChange?.(newFilters);
  };

  const handlePriceMinChange = (e) => {
    const value = e.target.value;
    setPriceMinInput(value);
    // Don't call onChange here - let debounce handle it
  };
  
  const handlePriceMaxChange = (e) => {
    const value = e.target.value;
    setPriceMaxInput(value);
    // Don't call onChange here - let debounce handle it
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
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
    <div>
      <label style={{ position: "absolute", left: "-9999px" }} htmlFor="price-min">
        Min price
      </label>
      <input
        id="price-min"
        type="number"
        inputMode="decimal"
        placeholder="Min"
        value={priceMinInput}
        onChange={handlePriceMinChange}
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
      <label style={{ position: "absolute", left: "-9999px" }} htmlFor="price-max">
        Max price
      </label>
      <input
        id="price-max"
        type="number"
        inputMode="decimal"
        placeholder="Max"
        value={priceMaxInput}
        onChange={handlePriceMaxChange}
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
