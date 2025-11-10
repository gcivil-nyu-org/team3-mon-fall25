import React from "react";
import { FaCalendar, FaBox, FaShoppingBag } from "react-icons/fa";
import "./SellerCard.css";

export default function SellerCard({
  username,
  memberSince,
  activeListings,
  soldItems,
  avatarUrl,
  onViewProfile,
}) {
  const formatMemberDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="seller-card">
      <h3 className="seller-card__title">Seller Information</h3>

      {/* Seller Profile */}
      <div className="seller-card__profile">
        <div className="seller-card__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={username} />
          ) : (
            <div className="seller-card__avatar-fallback">
              {getInitials(username)}
            </div>
          )}
        </div>
        <div className="seller-card__info">
          <p className="seller-card__name">{username}</p>
          <div className="seller-card__member-since">
            <FaCalendar className="seller-card__icon" />
            <span>Member since {formatMemberDate(memberSince)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="seller-card__stats">
        <div className="seller-card__stat">
          <FaBox className="seller-card__stat-icon" />
          <span>
            {activeListings} active listing{activeListings !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="seller-card__stat">
          <FaShoppingBag className="seller-card__stat-icon" />
          <span>
            {soldItems} sold item{soldItems !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* View Profile Button */}
      <button
        className="seller-card__button"
        onClick={onViewProfile}
      >
        View Profile
      </button>
    </div>
  );
}

