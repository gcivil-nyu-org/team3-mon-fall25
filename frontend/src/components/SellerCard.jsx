import React from 'react';
import { Link } from 'react-router-dom';
import { User, Package, CheckCircle } from 'lucide-react';
import './SellerCard.css';

export default function SellerCard({
  username,
  displayName,
  memberSince,
  activeListingsCount,
  totalSoldCount,
}) {
  const formatMemberSince = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getInitial = () => {
    if (displayName) return displayName.charAt(0).toUpperCase();
    if (username) return username.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <div className="seller-card">
      <h4 className="seller-card__title">Seller Information</h4>
      
      <div className="seller-card__profile">
        <div className="seller-card__avatar">
          {getInitial()}
        </div>
        
        <div className="seller-card__info">
          <div className="seller-card__name">{displayName || username || 'Unknown Seller'}</div>
          <div className="seller-card__member-since">
            Member since {formatMemberSince(memberSince)}
          </div>
        </div>
      </div>

      <div className="seller-card__stats">
        <div className="seller-card__stat">
          <Package className="seller-card__icon" size={18} />
          <span className="seller-card__stat-value">{activeListingsCount || 0}</span>
          <span className="seller-card__stat-label">Active Listings</span>
        </div>
        
        <div className="seller-card__stat">
          <CheckCircle className="seller-card__icon" size={18} />
          <span className="seller-card__stat-value">{totalSoldCount || 0}</span>
          <span className="seller-card__stat-label">Items Sold</span>
        </div>
      </div>

      <div className="seller-card__actions">
        <Link
          to={`/seller/${username}`}
          className="seller-card__btn"
        >
          <User size={16} />
          View Profile
        </Link>
      </div>
    </div>
  );
}
