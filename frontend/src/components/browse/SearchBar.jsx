import React, { useEffect, useState } from "react";
import { getListingSuggestions } from "../../api/listings";

export default function SearchBar({ defaultValue = "", onSearch, onSuggestionSelect }) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const hasValue = value.trim().length > 0;
  const MIN_CHARS = 2;
  const DEBOUNCE_MS = 300;

  // Keep input in sync with URL q
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const submit = (e) => {
    e?.preventDefault();
    if (!hasValue) {
      setError("Please enter a search term.");
      return;
    }
    setError("");
    setSuggestions([]);
    setHighlightedIndex(-1);
    onSearch?.(value.trim());
  };

  const clear = () => {
    setValue("");
    setError("");
    setSuggestions([]);
    setHighlightedIndex(-1);
    onSearch?.("");
  };

  const handleSuggestionClick = (suggestion) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion.listing_id);
    } else {
      // Fallback: populate and search by text
      setValue(suggestion.title);
      onSearch?.(suggestion.title);
    }
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
    }, 120);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      if (!suggestions.length) return;
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      if (!suggestions.length) return;
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSuggestionClick(suggestions[highlightedIndex]);
      } else {
        submit(e);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    if (!isFocused) return;

    const term = value.trim();
    if (term.length < MIN_CHARS) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const results = await getListingSuggestions(term);
        setSuggestions(results || []);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [value, isFocused]);

  return (
    <div style={{ position: "relative" }}>
      <form
        onSubmit={submit}
        style={{
          flex: 1,
          display: "flex",
          gap: 8,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: "8px 12px",
          background: "#fff",
        }}
      >
        <label style={{ position: "absolute", left: "-9999px" }} htmlFor="search-input">
          Search
        </label>
        <input
          id="search-input"
          type="text"
          placeholder="Search listings"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 14,
            background: "transparent",
          }}
        />
        {hasValue && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: 18,
              cursor: "pointer",
              marginRight: 4,
            }}
          >
            &#10005;
          </button>
        )}
        <button
          type="submit"
          style={{
            borderRadius: 12,
            background: "#56018D",
            color: "#fff",
            padding: "6px 16px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      {/* Suggestions dropdown */}
      {isFocused && (suggestions.length > 0 || loadingSuggestions) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
            zIndex: 20,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {loadingSuggestions && (
            <div style={{ padding: 8, fontSize: 13, color: "#6b7280" }}>
              Loading suggestions…
            </div>
          )}

          {suggestions.map((s, idx) => {
            const isActive = idx === highlightedIndex;
            return (
              <button
                key={s.listing_id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // avoid blur before click
                  handleSuggestionClick(s);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "none",
                  borderBottom: "1px solid #f3f4f6",
                  background: isActive ? "#f3e8ff" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {/* Tiny image on the left */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#f3f4f6",
                    flexShrink: 0,
                  }}
                >
                  {s.primary_image ? (
                    <img
                      src={s.primary_image}
                      alt={s.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      No image
                    </div>
                  )}
                </div>

                {/* Title on the right */}
                <div
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.title}
                </div>
              </button>
            );
          })}

          {!loadingSuggestions && suggestions.length === 0 && (
            <div style={{ padding: 8, fontSize: 13, color: "#9ca3af" }}>
              No suggestions
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ color: "#d32f2f", fontSize: 13, marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
