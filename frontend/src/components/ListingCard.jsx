import React from "react";
import "./ListingCard.css";
import { FaDollarSign, FaCheckCircle, FaEdit, FaTrash, FaBoxOpen } from "react-icons/fa";

export default function ListingCard({
  title,
  price,
  status,
  onEdit,
  onDelete,
  onMarkSold,
  onViewDetails,
}) {
  return (
    <div className="listing-card" onClick={onViewDetails}>
      <div className="image-placeholder">
        <FaBoxOpen size={50} color="#4B2E83" />
      </div>

      <div className="listing-info">
        <h2 className="listing-title">{title}</h2>
        <p className="price">
          <FaDollarSign className="icon" /> {price}
        </p>
        <p className={`status ${status.toLowerCase()}`}>
          <FaCheckCircle className="icon" /> {status}
        </p>
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
            onDelete();
          }}
        >
          <FaTrash className="icon" /> Delete
        </button>
      </div>
    </div>
  );
}
