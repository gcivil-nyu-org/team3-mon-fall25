import React from "react";
import "./ListingCardBuyer.css";

export default function ListingCardBuyer({
  id,
  title = "",
  price = 0,
  status = "active",
  imageUrl,        // can be string URL OR { url: "..." } OR undefined
  location,
  onClick,
}) {
  const isSold = String(status || "").toLowerCase() === "sold";

  // Inline SVG placeholder (no network needed)
  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
         <rect width='100%' height='100%' fill='#f3f4f6'/>
         <g fill='#56018D' font-family='Segoe UI, Arial, sans-serif'>
           <rect x='150' y='90' width='100' height='70' rx='6' fill='#e9ddf5'/>
           <text x='200' y='200' text-anchor='middle' font-size='18' fill='#56018D'>No image</text>
         </g>
       </svg>`
    );

  // Coerce various backend shapes to a usable URL
  function safeUrl(src) {
    if (!src) return PLACEHOLDER;
    if (typeof src === "string" && src.trim().length > 0) return src;
    if (typeof src === "object" && typeof src.url === "string" && src.url.trim().length > 0) {
      return src.url;
    }
    return PLACEHOLDER;
  }

  return (
    <button className="buyer-card" onClick={onClick} aria-label={`Open ${title}`}>
      <div className="buyer-card__imgWrap">
        <img
          className="buyer-card__img"
          src={safeUrl(imageUrl)}
          alt={title}
          loading="lazy"
          onError={(e) => {
            // if the URL 404s or is bad, force the placeholder once
            e.currentTarget.onerror = null;
            e.currentTarget.src = PLACEHOLDER;
          }}
        />
        {isSold && <div className="buyer-card__sold">Sold</div>}
      </div>

      <div className="buyer-card__body">
        <div className="buyer-card__row">
          <h3 className="buyer-card__title" title={title}>
            {title}
          </h3>
          <div className="buyer-card__price">${Number(price).toFixed(2)}</div>
        </div>

        <div className="buyer-card__meta">
          <span className={`buyer-card__badge ${isSold ? "is-sold" : "is-active"}`}>
            {isSold ? "Sold" : "Active"}
          </span>
          {location ? <span className="buyer-card__loc">{location}</span> : null}
        </div>
      </div>
    </button>
  );
}
