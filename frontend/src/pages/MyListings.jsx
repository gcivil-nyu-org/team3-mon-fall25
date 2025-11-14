import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListingCard from "../components/ListingCard";
import { getMyListings, patchListing, deleteListingAPI } from "../api/listings.js";
import SEO from "../components/SEO";

export default function MyListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user's listings
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyListings();

        if (!cancelled) {
          const mapped = data.map((l) => ({
            id: l.listing_id,
            title: l.title,
            price: l.price,
            status: l.status?.charAt(0).toUpperCase() + l.status?.slice(1),
            category: l.category,
            location: l.location,
            description: l.description,
            imageUrl: l.primary_image,
          }));
          setListings(mapped);
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e.response?.data?.detail || e.message || "Failed to load your listings.";
          setError(msg);
          console.error("Failed to load listings:", e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Separate loadListings function for retry button
  const loadListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyListings();

      const mapped = data.map((l) => ({
        id: l.listing_id,
        title: l.title,
        price: l.price,
        status: l.status?.charAt(0).toUpperCase() + l.status?.slice(1),
        category: l.category,
        location: l.location,
        description: l.description,
        imageUrl: l.primary_image,
      }));
      setListings(mapped);
    } catch (e) {
      const msg =
        e.response?.data?.detail || e.message || "Failed to load your listings.";
      setError(msg);
      console.error("Failed to load listings:", e);
    } finally {
      setLoading(false);
    }
  };

  const markAsSold = async (id) => {
    const current = listings.find((l) => l.id === id);
    if (!current) return;

    // Optimistic UI update
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "Sold" } : l))
    );

    try {
      // Only send status field for patch
      await patchListing(id, { status: "sold" });
    } catch (err) {
      // Roll back on failure
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: current.status } : l))
      );
      console.error("Failed to mark as sold:", err);
      alert("Failed to mark as sold. Please try again.");
    }
  };

  const editListing = (id) => {
    navigate(`/listing/${id}/edit`);
  };

  const deleteListing = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this listing? This action cannot be undone."
    );

    if (!confirmed) return;

    // Optimistic UI update
    setListings((prev) => prev.filter((l) => l.id !== id));

    try {
      const success = await deleteListingAPI(id);

      if (!success) {
        // Roll back if delete failed
        loadListings();
        alert("Failed to delete listing. Please try again.");
      }
    } catch (err) {
      console.error("Failed to delete listing:", err);
      // Roll back on error
      loadListings();
      alert("Failed to delete listing. Please try again.");
    }
  };

  const viewDetails = (id) => {
    navigate(`/listing/${id}`);
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>My Listings</h1>
        <p>Loading your listings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>My Listings</h1>
        <div style={{
          background: "#FEE2E2",
          border: "1px solid #FCA5A5",
          color: "#991B1B",
          padding: 16,
          borderRadius: 8,
          maxWidth: 600,
          margin: "0 auto",
        }}>
          {error}
        </div>
        <button
          onClick={loadListings}
          style={{
            marginTop: 20,
            padding: "10px 20px",
            background: "#56018D",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="My Listings - NYU Marketplace"
        description="Manage, edit, and track your posted items."
        canonical="http://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com/my-listings"
      />

      <div className="my-listings-page" style={{ padding: "60px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32 }}>My Listings</h1>

          {listings.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #E5E7EB",
            }}>
              <p style={{ fontSize: 18, color: "#6b7280", marginBottom: 20 }}>
                You haven't created any listings yet.
              </p>
              <button
                onClick={() => navigate("/create-listing")}
                style={{
                  padding: "12px 24px",
                  background: "#56018D",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create Your First Listing
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  {...listing}
                  onMarkSold={() => markAsSold(listing.id)}
                  onEdit={() => editListing(listing.id)}
                  onDelete={() => deleteListing(listing.id)}
                  onViewDetails={() => viewDetails(listing.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
