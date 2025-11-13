import React from "react";
import { FaBoxOpen } from "react-icons/fa";
import "./ListingCardBuyer.css";

export default function ListingCardBuyer({
  title = "",
  price = 0,
  status = "active",
  imageUrl,        // can be string URL OR { url: "..." } OR undefined
  location,
  onClick,
  onRemove,
  onViewDetails,
}) {
  const isSold = String(status || "").toLowerCase() === "sold";

  // Check if we have a valid image URL
  const hasValidImage = imageUrl &&
    ((typeof imageUrl === "string" && imageUrl.trim().length > 0) ||
     (typeof imageUrl === "object" && typeof imageUrl.url === "string" && imageUrl.url.trim().length > 0));

  // Get the actual URL if available
  const actualImageUrl = typeof imageUrl === "string" ? imageUrl : imageUrl?.url;

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails();
    } else if (onClick) {
      onClick();
    }
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="buyer-card" style={{ position: "relative" }}>
      {onRemove && (
        <button
          onClick={handleRemoveClick}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 14,
            color: "#dc2626",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
          title="Remove from watchlist"
        >
          ×
        </button>
      )}
      <button className="buyer-card__button" onClick={handleCardClick} aria-label={`Open ${title}`} style={{ width: "100%", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
      <div className="buyer-card__imgWrap">
        {hasValidImage ? (
          <img
            className="buyer-card__img"
            src={actualImageUrl}
            alt={title}
            loading="lazy"
            onError={(e) => {
              // If image fails to load, hide it and show placeholder
              e.currentTarget.style.display = 'none';
              const placeholder = e.currentTarget.parentElement.querySelector('.buyer-card__placeholder');
              if (placeholder) placeholder.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="buyer-card__placeholder"
          style={{
            display: hasValidImage ? 'none' : 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F5F5F5'
          }}
        >
          <FaBoxOpen size={50} color="#56018D" />
        </div>
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
    </div>
  );
}
