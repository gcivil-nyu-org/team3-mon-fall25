import { useState, useEffect, useRef } from "react";

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
  
  // Validation errors state
  const [priceMinError, setPriceMinError] = useState("");
  const [priceMaxError, setPriceMaxError] = useState("");
  
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Validation functions (defined before use)
  const validatePriceMin = (value) => {
    if (value === "" || value === null || value === undefined) {
      return ""; // Empty is allowed
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return "Must be a valid number";
    }
    if (numValue < 0) {
      return "Minimum price must be 0 or greater";
    }
    return "";
  };

  const validatePriceMax = (value, minValue) => {
    if (value === "" || value === null || value === undefined) {
      return ""; // Empty is allowed
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return "Must be a valid number";
    }
    if (numValue < 0) {
      return "Maximum price must be 0 or greater";
    }
    if (minValue !== "" && minValue !== null && minValue !== undefined) {
      const minNum = Number(minValue);
      if (!isNaN(minNum) && numValue < minNum) {
        return "Maximum price must be greater than or equal to minimum price";
      }
    }
    return "";
  };

  // Debounced values that trigger onChange callback
  const debouncedPriceMin = useDebounce(priceMinInput, PRICE_DEBOUNCE_DELAY);
  const debouncedPriceMax = useDebounce(priceMaxInput, PRICE_DEBOUNCE_DELAY);

  // Update filters when debounced values change and trigger onChange (only if valid)
  useEffect(() => {
    // Validate debounced values
    const minError = validatePriceMin(debouncedPriceMin);
    const maxError = validatePriceMax(debouncedPriceMax, debouncedPriceMin);
    
    // Only update if validation passes
    if (!minError && !maxError) {
      setFilters((prev) => {
        const hasChanged =
          prev.priceMin !== debouncedPriceMin || prev.priceMax !== debouncedPriceMax;
        if (!hasChanged) {
          return prev;
        }

        const newFilters = {
          ...prev,
          priceMin: debouncedPriceMin,
          priceMax: debouncedPriceMax,
        };
        onChangeRef.current?.(newFilters);
        return newFilters;
      });
    }
  }, [debouncedPriceMin, debouncedPriceMax]);

  // Sync input state when initial props change (e.g., from URL)
  useEffect(() => {
    setPriceMinInput(initial.priceMin ?? "");
    setPriceMaxInput(initial.priceMax ?? "");
    // Clear validation errors when syncing from initial props
    setPriceMinError("");
    setPriceMaxError("");
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
    
    // Real-time validation
    const error = validatePriceMin(value);
    setPriceMinError(error);
    
    // Also validate max in case min changed affects max validation
    if (!error && priceMaxInput !== "" && priceMaxInput !== null && priceMaxInput !== undefined) {
      const maxError = validatePriceMax(priceMaxInput, value);
      setPriceMaxError(maxError);
    } else if (!error) {
      // Clear max error if min is now valid and max is empty
      setPriceMaxError("");
    }
    
    // Don't call onChange here - let debounce handle it
  };
  
  const handlePriceMaxChange = (e) => {
    const value = e.target.value;
    setPriceMaxInput(value);
    
    // Real-time validation
    const error = validatePriceMax(value, priceMinInput);
    setPriceMaxError(error);
    
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
                border: priceMinError ? "1px solid #d32f2f" : "1px solid #e5e7eb",
                padding: "8px 12px",
                background: "#fff",
                fontSize: 14,
              }}
            />
            {priceMinError && (
              <div style={{ color: "#d32f2f", fontSize: 13, marginTop: 6 }}>
                {priceMinError}
              </div>
            )}
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
                border: priceMaxError ? "1px solid #d32f2f" : "1px solid #e5e7eb",
                padding: "8px 12px",
                background: "#fff",
                fontSize: 14,
              }}
            />
            {priceMaxError && (
              <div style={{ color: "#d32f2f", fontSize: 13, marginTop: 6 }}>
                {priceMaxError}
              </div>
            )}
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
