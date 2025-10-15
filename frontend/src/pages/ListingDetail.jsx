import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBoxOpen, FaDollarSign, FaEdit, FaCheckCircle, FaTrash } from "react-icons/fa";
import "./ListingDetail.css";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 🔧 Placeholder data — will later come from backend
  const listing = {
    id,
    title: "MacBook Pro",
    price: 1200,
    status: "Active",
    description: "A powerful MacBook Pro with M1 Pro chip, 16GB RAM, and 512GB SSD. Perfect for development and design work.",
  };

  return (
    <div className="listing-detail-page">
      <div className="listing-detail-card">
        <div className="image-placeholder">
          <FaBoxOpen size={80} color="#5A2D82" />
        </div>

        <h1 className="listing-title">{listing.title}</h1>

        <p className="listing-price">
          <FaDollarSign /> {listing.price}
        </p>

        <p className={`listing-status ${listing.status.toLowerCase()}`}>
          <FaCheckCircle /> {listing.status}
        </p>

        <p className="listing-description">{listing.description}</p>

        <div className="listing-actions">
          <button
            className="btn edit"
            onClick={() => {
              navigate(`/listing/${id}/edit`);
            }}
          >
            <FaEdit /> Edit Listing
          </button>

          <button
            className="btn sold"
            onClick={(e) => {
              e.stopPropagation();
              console.log("Mark as Sold clicked");
            }}
          >
            <FaCheckCircle /> Mark as Sold
          </button>

          <button
            className="btn delete"
            onClick={(e) => {
              e.stopPropagation();
              console.log("Delete clicked");
            }}
          >
            <FaTrash /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
