import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListingCardBuyer from "../components/ListingCardBuyer";
import { getWatchlist, removeFromWatchlist } from "../api/watchlist";
import SEO from "../components/SEO";

export default function Watchlist() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load watchlist
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getWatchlist();

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
            e.response?.data?.detail || e.message || "Failed to load your watchlist.";
          setError(msg);
          console.error("Failed to load watchlist:", e);
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

  // Separate loadWatchlist function for retry button
  const loadWatchlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWatchlist();

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
        e.response?.data?.detail || e.message || "Failed to load your watchlist.";
      setError(msg);
      console.error("Failed to load watchlist:", e);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlistHandler = async (id) => {
    // Optimistic UI update
    setListings((prev) => prev.filter((l) => l.id !== id));

    try {
      await removeFromWatchlist(id);
    } catch (err) {
      // Roll back on failure
      loadWatchlist();
      console.error("Failed to remove from watchlist:", err);
      alert("Failed to remove from watchlist. Please try again.");
    }
  };

  const viewDetails = (id) => {
    navigate(`/listing/${id}`);
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>Saved Listings</h1>
        <p>Loading your saved listings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>Saved Listings</h1>
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
          onClick={loadWatchlist}
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
        title="Saved Listings - NYU Marketplace"
        description="View and manage your saved listings."
        canonical="http://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com/watchlist"
      />

      <div className="watchlist-page" style={{ padding: "60px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Saved Listings</h1>

          {listings.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #E5E7EB",
            }}>
              <p style={{ fontSize: 18, color: "#6b7280", marginBottom: 20 }}>
                You haven't saved any listings yet.
              </p>
              <button
                onClick={() => navigate("/browse")}
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
                Browse Listings
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {listings.map((listing) => (
                <ListingCardBuyer
                  key={listing.id}
                  {...listing}
                  onRemove={() => removeFromWatchlistHandler(listing.id)}
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

