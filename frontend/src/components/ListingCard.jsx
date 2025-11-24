import React from "react";
import "./ListingCard.css";
// 1. Added FaClock and FaEye to imports
import { FaDollarSign, FaCheckCircle, FaEdit, FaTrash, FaBoxOpen, FaClock, FaEye } from "react-icons/fa";
// 2. Import the date utility
import { humanizePosted } from "../utils/date"; 

export default function ListingCard({
  id,
  title,
  price,
  status,
  imageUrl,
  // 3. Add new props here
  createdAt,
  viewCount,
  onEdit,
  onDelete,
  onMarkSold,
  onViewDetails,
}) {
  
  // 4. Calculate the time string
  const postedText = createdAt ? humanizePosted(createdAt) : "";

  return (
    <div className="listing-card" onClick={onViewDetails}>
      <div className="image-placeholder">
        {imageUrl ? (
          <img src={imageUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <FaBoxOpen size={50} color="#4B2E83" />
        )}
      </div>

      <div className="listing-info">
        <h2 className="listing-title">{title}</h2>
        <p className="price">
          <FaDollarSign className="icon" /> {price}
        </p>
        <p className={`status ${status.toLowerCase()}`}>
          <FaCheckCircle className="icon" /> {status}
        </p>

        {/* 5. New Metadata Section (Time & Views) */}
        <div className="listing-meta" style={{ display: 'flex', gap: '12px', marginTop: '8px', color: '#666', fontSize: '0.9rem' }}>
            {createdAt && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title={new Date(createdAt).toLocaleString()}>
                    <FaClock /> {postedText}
                </span>
            )}
            {typeof viewCount === "number" && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title={`${viewCount} views`}>
                    <FaEye /> {viewCount}
                </span>
            )}
        </div>
      </div>

      <div className="listing-actions">
        <button
          className="btn sold"
          onClick={(e) => {
            e.stopPropagation();
            onMarkSold();
          }}
        >
          <FaCheckCircle className="icon" /> Mark as Sold
        </button>

        <button
          className="btn edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <FaEdit className="icon" /> Edit
        </button>

        <button
          className="btn delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
        >
          <FaTrash className="icon" /> Delete
        </button>
      </div>
    </div>
  );
}