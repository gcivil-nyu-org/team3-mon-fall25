import { useEffect, useState } from "react";

export default function Filters({ initial = {}, onChange }) {
  const [category, setCategory] = useState(initial.category ?? "");
  const [condition, setCondition] = useState(initial.condition ?? "");
  const [minPrice, setMinPrice] = useState(initial.min_price ?? "");
  const [maxPrice, setMaxPrice] = useState(initial.max_price ?? "");
  const [availableOnly, setAvailableOnly] = useState(!!initial.available_only);
  const [pickupOnly, setPickupOnly] = useState(!!initial.pickup_only);

  useEffect(() => {
    onChange?.({
      category,
      condition,
      min_price: minPrice,
      max_price: maxPrice,
      available_only: availableOnly || undefined,
      pickup_only: pickupOnly || undefined,
    });
  }, [category, condition, minPrice, maxPrice, availableOnly, pickupOnly]);

  const block = { marginBottom: 16 };
  const input = { width: "100%", border: "1px solid #e5e7eb", borderRadius: 12, padding: "8px 10px" };

  return (
    <aside>
      <div style={block}>
        <h4 style={{ margin: "0 0 .5rem", fontWeight: 600 }}>Category</h4>
        <div style={{ display: "grid", gap: 6 }}>
          {[
            ["", "All"],
            ["electronics", "Electronics"],
            ["books", "Books"],
            ["furniture", "Furniture"],
            ["apparel", "Apparel"],
            ["other", "Other"],
          ].map(([val, label]) => (
            <label key={val} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="radio" name="category" value={val} checked={category === val} onChange={(e) => setCategory(e.target.value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={block}>
        <h4 style={{ margin: "0 0 .5rem", fontWeight: 600 }}>Condition</h4>
        <select value={condition} onChange={(e) => setCondition(e.target.value)} style={input}>
          <option value="">Any</option>
          <option value="new">New</option>
          <option value="like_new">Like New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </select>
      </div>

      <div style={block}>
        <h4 style={{ margin: "0 0 .5rem", fontWeight: 600 }}>Price Range</h4>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input placeholder="Min" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={input} />
          <span>–</span>
          <input placeholder="Max" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={input} />
        </div>
      </div>

      <div style={block}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
          <span>Available only</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={pickupOnly} onChange={(e) => setPickupOnly(e.target.checked)} />
          <span>Pick-up only</span>
        </label>
      </div>

      <button
        onClick={() => { setCategory(""); setCondition(""); setMinPrice(""); setMaxPrice(""); setAvailableOnly(false); setPickupOnly(false); }}
        style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "8px 12px", background: "#fff", width: "100%" }}
      >
        Reset filters
      </button>
    </aside>
  );
}
