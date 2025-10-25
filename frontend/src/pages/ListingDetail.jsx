import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBoxOpen, FaDollarSign, FaEdit, FaCheckCircle, FaTrash } from "react-icons/fa";
import { getListing, markListingSold } from "@/api/listings"; // <-- new
import "./ListingDetail.css";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getListing(id);
        if (mounted) setListing(data);
      } catch (e) {
        console.error(e);
        if (mounted) setError("Failed to load listing.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const onMarkSold = async (e) => {
    e.stopPropagation();
    if (!listing || listing.status === "sold") return;

    try {
      setSaving(true);
      const updated = await markListingSold(listing);
      setListing(updated); // backend returns fresh record
      window.alert("Listing marked as sold.");
    } catch (e) {
      console.error(e);
      window.alert("Failed to mark as sold.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="listing-detail-page"><div className="listing-detail-card">Loading…</div></div>;
  }
  if (error || !listing) {
    return <div className="listing-detail-page"><div className="listing-detail-card">{error || "Not found"}</div></div>;
  }

  // API returns: listing_id, price (string), status ("active"/"sold"/"inactive"), etc.
  const priceDisplay = typeof listing.price === "string" ? listing.price : String(listing.price);
  const statusClass = (listing.status || "").toLowerCase();

  return (
    <div className="listing-detail-page">
      <div className="listing-detail-card">
        <div className="image-placeholder">
          <FaBoxOpen size={80} color="#5A2D82" />
        </div>

        <h1 className="listing-title">{listing.title}</h1>

        <p className="listing-price">
          <FaDollarSign /> {priceDisplay}
        </p>

        <p className={`listing-status ${statusClass}`}>
          <FaCheckCircle /> {listing.status}
        </p>

        <p className="listing-description">{listing.description}</p>

        <div className="listing-actions">
          <button
            className="btn edit"
            onClick={() => navigate(`/listing/${listing.listing_id}/edit`)}
          >
            <FaEdit /> Edit Listing
          </button>

          <button
            className="btn sold"
            disabled={listing.status === "sold" || saving}
            onClick={onMarkSold}
            title={listing.status === "sold" ? "Already sold" : "Mark as Sold"}
          >
            <FaCheckCircle /> {saving ? "Updating..." : listing.status === "sold" ? "Sold" : "Mark as Sold"}
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
