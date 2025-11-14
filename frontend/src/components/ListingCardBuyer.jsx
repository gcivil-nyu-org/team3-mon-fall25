import React from "react";
import { useNavigate } from "react-router-dom";
import { FaBoxOpen, FaUser, FaClock, FaEye } from "react-icons/fa";
import { humanizePosted } from "../utils/date";
import "./ListingCardBuyer.css";

export default function ListingCardBuyer({
  title = "",
  price = 0,
  status = "active",
  imageUrl,        // can be string URL OR { url: "..." } OR undefined
  location,
  sellerUsername,
  createdAt,
  viewCount,
  onClick,
  onRemove,
  onViewDetails,
  onSellerClick,
}) {
  const navigate = useNavigate();

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

  // Date String
  const postedText = createdAt ? humanizePosted(createdAt) : "";

  const sellerProfilePath = (u) => `/seller/${encodeURIComponent(u)}`;

  const handleSellerClick = (e) => {
    e.stopPropagation();
    if (!sellerUsername) return;
    if (onSellerClick) onSellerClick(sellerUsername);
    else navigate(sellerProfilePath(sellerUsername));
  };

  const handleSellerKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSellerClick(e);
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

          {/* The third row: seller / created_at / view_count */}
          {(sellerUsername || createdAt || typeof viewCount === "number") && (
            <div className="buyer-card__extra">
              <div className="buyer-card__extraLeft">
                {sellerUsername && (
                  <span
                    className="buyer-card__seller"
                    role="link"
                    tabIndex={0}
                    title={`@${sellerUsername}`}
                    onClick={handleSellerClick}
                    onKeyDown={handleSellerKeyDown}
                  >
                    <FaUser className="buyer-card__icon" aria-hidden="true" />
                    <span>Listed by @{sellerUsername}</span>
                  </span>
                )}
                {createdAt && (
                  <span
                    className="buyer-card__posted"
                    title={new Date(createdAt).toLocaleString()}
                  >
                    <FaClock className="buyer-card__icon" aria-hidden="true" />
                    <span>{postedText}</span>
                  </span>
                )}
              </div>
              
              {typeof viewCount === "number" && (
                <span className="buyer-card__views" title={`${viewCount} views`}>
                  <FaEye className="buyer-card__icon" aria-hidden="true" />
                  <span>{viewCount}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
