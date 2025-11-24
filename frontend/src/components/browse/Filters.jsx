import { useState, useEffect, useRef } from "react";
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";
import { CATEGORIES, LOCATIONS, DORM_LOCATIONS_GROUPED } from "../../constants/filterOptions";

// Checkbox component that supports indeterminate state
function SelectAllCheckbox({ checked, indeterminate, onChange }) {
  const checkboxRef = useRef(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        marginRight: 8,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
      />
    </label>
  );
}

// Component for grouped dorm locations with collapsible sections
function DormLocationGroups({ dormLocations, selectedLocations, onToggle }) {
  const [expandedGroups, setExpandedGroups] = useState({
    washington_square: false,
    downtown: false,
    other: false,
  });

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const groupLabels = {
    washington_square: "Washington Square",
    downtown: "Downtown",
    other: "Other",
  };

  // Check if all locations in a group are selected
  const areAllSelected = (locations) => {
    return locations.every((loc) => selectedLocations.includes(loc));
  };

  // Check if some (but not all) locations in a group are selected
  const areSomeSelected = (locations) => {
    const selectedCount = locations.filter((loc) => selectedLocations.includes(loc)).length;
    return selectedCount > 0 && selectedCount < locations.length;
  };

  // Toggle all locations in a group
  const toggleGroupSelection = (locations, groupName, e) => {
    e.stopPropagation(); // Prevent collapsing/expanding when clicking checkbox
    const allSelected = areAllSelected(locations);

    // Calculate new locations array: add all if not all selected, remove all if all selected
    let newLocations;
    if (allSelected) {
      // Deselect all locations in this group
      newLocations = selectedLocations.filter((loc) => !locations.includes(loc));
    } else {
      // Select all locations in this group (add missing ones)
      const locationsToAdd = locations.filter((loc) => !selectedLocations.includes(loc));
      newLocations = [...selectedLocations, ...locationsToAdd];
    }

    // Update all at once by calling onToggle with the new array (batch update)
    onToggle("locations", newLocations);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Object.entries(dormLocations).map(([groupName, locations]) => {
        if (!locations || locations.length === 0) return null;

        const isExpanded = expandedGroups[groupName];
        const groupLabel = groupLabels[groupName] || groupName;
        const allSelected = areAllSelected(locations);
        const someSelected = areSomeSelected(locations);

        return (
          <div key={groupName} style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}>
            {/* Group Header - Collapsible with Select All */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#f9fafb",
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                padding: "10px 12px",
              }}
            >
              {/* Select All Checkbox */}
              <SelectAllCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={(e) => toggleGroupSelection(locations, groupName, e)}
              />
              {/* Collapse/Expand Button */}
              <button
                type="button"
                onClick={() => toggleGroup(groupName)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  padding: 0,
                }}
                onMouseOver={(e) => (e.target.style.opacity = "0.8")}
                onMouseOut={(e) => (e.target.style.opacity = "1")}
              >
                <span>{groupLabel}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {isExpanded ? "▼" : "▶"}
                </span>
              </button>
            </div>

            {/* Group Content - Collapsible */}
            {isExpanded && (
              <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                {locations.map((location) => (
                  <label
                    key={location}
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
                      checked={selectedLocations.includes(location)}
                      onChange={() => onToggle("locations", location)}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
                    />
                    {location}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
const PRICE_MIN = 0;
// TODO: Investigate dynamic PRICE_MAX based on actual listing prices
// Options:
// 1. Calculate from listings data already fetched in BrowseListings
//    - Find max price from current listings results
//    - Pass as prop to Filters component
// 2. Add separate price-stats endpoint
//    - GET /api/v1/listings/price-stats/ returns { min_price, max_price }
//    - Fetch on mount in BrowseListings and pass to Filters
const PRICE_MAX = 2000;
const PRICE_STEP = 10;

export default function Filters({ initial = {}, onChange, options = {} }) {
  // Use hardcoded values as fallback, but prefer provided options if available
  const {
    categories: apiCategories = [],
    dorm_locations: apiDormLocations = null, // Grouped structure: { washington_square: [...], downtown: [...], other: [...] }
  } = options;

  const availableCategories = apiCategories.length > 0 ? apiCategories : CATEGORIES;
  // Use grouped dorm_locations if available, otherwise fallback to grouped structure
  // Note: dormLocationsForDisplay will always be truthy due to DORM_LOCATIONS_GROUPED fallback
  const dormLocationsForDisplay = apiDormLocations || DORM_LOCATIONS_GROUPED;

  const [filters, setFilters] = useState({
    categories: initial.categories || [],
    locations: initial.locations || [],
    priceMin: initial.priceMin ?? "",
    priceMax: initial.priceMax ?? "",
    dateRange: initial.dateRange || "",
  });

  // Local state for immediate UI updates (not debounced)
  const [priceMinInput, setPriceMinInput] = useState(filters.priceMin);
  const [priceMaxInput, setPriceMaxInput] = useState(filters.priceMax);

  // Helper to get numeric value for slider (defaults to min/max if empty)
  const getSliderValue = (value, isMin) => {
    if (value === "" || value === null || value === undefined) {
      return isMin ? PRICE_MIN : PRICE_MAX;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return isMin ? PRICE_MIN : PRICE_MAX;
    }
    return Math.max(PRICE_MIN, Math.min(PRICE_MAX, num));
  };

  const minSliderValue = getSliderValue(priceMinInput, true);
  const maxSliderValue = getSliderValue(priceMaxInput, false);

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
    // Support both single value toggle and batch array update
    const current = filters[type] || [];
    let updated;

    if (Array.isArray(value)) {
      // Batch update: value is the new array
      updated = value;
    } else {
      // Single toggle: add or remove the value
      updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
    }

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

  const handleDateRangeChange = (value) => {
    const newFilters = { ...filters, dateRange: value };
    setFilters(newFilters);
    onChange?.(newFilters);
  };

  const handleSliderChange = (value) => {
    // value is an array [min, max]
    const [min, max] = value;
    setPriceMinInput(String(min));
    setPriceMaxInput(String(max));
  };

  const handleClearAll = () => {
    const cleared = {
      categories: [],
      locations: [],
      priceMin: "",
      priceMax: "",
      dateRange: "",
    };
    setFilters(cleared);
    setPriceMinInput("");
    setPriceMaxInput("");
    setPriceMinError("");
    setPriceMaxError("");
    onChange?.(cleared);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.locations.length > 0 ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.dateRange !== "";

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: 24,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      position: "relative",
    }}>
      {/* Clear All Button - Fixed position at top right */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearAll}
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            fontSize: 12,
            color: "#56018D",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontWeight: 500,
            textDecoration: "underline",
            zIndex: 1,
          }}
          onMouseOver={(e) => {
            e.target.style.opacity = "0.7";
          }}
          onMouseOut={(e) => {
            e.target.style.opacity = "1";
          }}
        >
          Clear all filters
        </button>
      )}

      {/* Category Filter */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Category
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {availableCategories.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>Loading...</div>
          ) : (
            availableCategories.map((cat) => (
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
            ))
          )}
        </div>
      </div>

      {/* Location Filter - Grouped with collapsible sections */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Location
        </h4>
        <DormLocationGroups
          dormLocations={dormLocationsForDisplay}
          selectedLocations={filters.locations}
          onToggle={handleCheckbox}
        />
      </div>

      {/* Price Range */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Price Range
        </h4>

        {/* Double Range Slider */}
        <div style={{ marginBottom: 20, padding: "12px 0" }}>
          <RangeSlider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={[minSliderValue, maxSliderValue]}
            onInput={handleSliderChange}
            className="price-range-slider"
          />
          <style>{`
            .price-range-slider {
              height: 8px;
              background: #e5e7eb;
              border-radius: 4px;
            }
            .price-range-slider .range-slider__range {
              background: #56018D;
              border-radius: 4px;
            }
            .price-range-slider .range-slider__thumb {
              width: 24px;
              height: 24px;
              background: linear-gradient(135deg, #56018D 0%, #7B1FA2 100%);
              border: 3px solid #fff;
              box-shadow: 0 2px 8px rgba(86, 1, 141, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .price-range-slider .range-slider__thumb:hover {
              transform: translate(-50%, -50%) scale(1.1);
              box-shadow: 0 4px 12px rgba(86, 1, 141, 0.4), 0 6px 16px rgba(0, 0, 0, 0.2);
            }
            .price-range-slider .range-slider__thumb:active {
              transform: translate(-50%, -50%) scale(1.05);
              box-shadow: 0 2px 6px rgba(86, 1, 141, 0.5), 0 4px 10px rgba(0, 0, 0, 0.25);
            }
            .price-range-slider .range-slider__thumb:focus-visible {
              outline: 0;
              box-shadow: 0 0 0 6px rgba(86, 1, 141, 0.5);
            }
          `}</style>
        </div>

        {/* Input Boxes */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32 }}>
          <div style={{ flex: "0 1 calc(50% - 16px)" }}>
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
          <div style={{ flex: "0 1 calc(50% - 16px)" }}>
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

      {/* Date Posted */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#111" }}>
          Date Posted
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label
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
              type="radio"
              name="date-range"
              value="24h"
              checked={filters.dateRange === "24h"}
              onChange={() => handleDateRangeChange("24h")}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
            />
            Last 24 hours
          </label>
          <label
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
              type="radio"
              name="date-range"
              value="7d"
              checked={filters.dateRange === "7d"}
              onChange={() => handleDateRangeChange("7d")}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
            />
            Last 7 days
          </label>
          <label
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
              type="radio"
              name="date-range"
              value="30d"
              checked={filters.dateRange === "30d"}
              onChange={() => handleDateRangeChange("30d")}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
            />
            Last 30 days
          </label>
          <label
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
              type="radio"
              name="date-range"
              value=""
              checked={filters.dateRange === ""}
              onChange={() => handleDateRangeChange("")}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#56018D" }}
            />
            Any time
          </label>
        </div>
      </div>
    </div>
  );
}
