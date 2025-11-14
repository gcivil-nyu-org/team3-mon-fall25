import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaBoxOpen,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkerAlt,
  FaCalendar,
  FaCommentDots,
  FaTimes,
  FaArrowLeft,
  FaShareAlt,
  FaHeart,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { getListing, getListings } from "@/api/listings";
import { addToWatchlist, removeFromWatchlist } from "../api/watchlist";
import { useAuth } from "../contexts/AuthContext";
import SellerCard from "../components/SellerCard";
import ContactSellerModal from "../components/ContactSellerModal";
import "./ListingDetail.css";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sellerStats, setSellerStats] = useState({
    activeListings: 0,
    soldItems: 0,
  });

  useEffect(() => {
    // Don't try to load if there's no ID (e.g., when rendered in background on chat page)
    if (!id) {
      setLoading(false);
      return;
    }
    
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(""); // Clear any previous errors
        const data = await getListing(id, { trackView: true });
        if (mounted) {
          setListing(data);
          setCurrentImageIndex(0); // Reset image index when listing changes
          setIsSaved(data?.is_saved || false);
        }
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

  // Prepare images array (use listing images or empty array)
  const images = listing?.images && listing.images.length > 0 
    ? listing.images 
    : [];
  const imagesLength = images.length;

  // Keyboard navigation for lightbox - must be before early returns
  useEffect(() => {
    if (!lightboxOpen || imagesLength === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        setCurrentImageIndex((prev) => (prev - 1 + imagesLength) % imagesLength);
      } else if (e.key === "ArrowRight") {
        setCurrentImageIndex((prev) => (prev + 1) % imagesLength);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, imagesLength]);

  // Fetch seller stats (active listings and sold items count) - must be before early returns
  useEffect(() => {
    if (!listing?.user_netid && !listing?.user_email) return;

    let mounted = true;
    (async () => {
      try {
        const sellerUsername = listing.user_netid || listing.user_email?.split("@")[0];
        if (!sellerUsername) return;

        // Fetch all listings to count seller's listings
        // Note: API only returns active listings, so we'll include the current listing
        // if it's sold/inactive to get accurate counts
        const allListings = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          try {
            const response = await getListings({ page, page_size: 100 });
            console.log(`Fetched page ${page}:`, {
              responseType: Array.isArray(response) ? 'array' : typeof response,
              response: response,
              resultsCount: Array.isArray(response) ? response.length : (response?.results?.length || 0),
              hasNext: Array.isArray(response) ? false : !!response?.next,
              totalCount: Array.isArray(response) ? response.length : response?.count,
              listingIds: Array.isArray(response) 
                ? response.map(r => r.listing_id) 
                : (response?.results?.map(r => r.listing_id) || [])
            });
            
            // Handle both array and object responses (like BrowseListings does)
            let pageResults = [];
            let hasNextPage = false;
            
            if (Array.isArray(response)) {
              pageResults = response;
              hasNextPage = false; // Arrays don't have pagination
            } else if (response && typeof response === "object" && "results" in response) {
              pageResults = response.results || [];
              hasNextPage = !!response.next;
            }
            
            if (pageResults.length > 0) {
              allListings.push(...pageResults);
              hasMore = hasNextPage;
              page++;
            } else {
              hasMore = false;
            }
          } catch (err) {
            console.error(`Failed to fetch page ${page}:`, err);
            console.error("Error details:", err.response?.data || err.message);
            hasMore = false;
          }
        }

        console.log(`Total listings fetched from all pages: ${allListings.length}`);
        console.log(`All listing IDs:`, allListings.map(l => l.listing_id));

        // Fetch details for all listings to get user info
        const listingPromises = allListings.map((l) =>
          getListing(l.listing_id).catch((err) => {
            console.error(`Failed to fetch listing ${l.listing_id}:`, err);
            return null;
          })
        );
        const listingDetails = await Promise.all(listingPromises);

        console.log(`Fetched details for ${listingDetails.filter(Boolean).length} listings`);
        console.log(`Looking for seller: ${sellerUsername}`);
        console.log(`Current listing user_netid: ${listing.user_netid}, user_email: ${listing.user_email}`);

        // Filter listings by seller
        const sellerListings = listingDetails
          .filter(Boolean)
          .filter((detail) => {
            if (!detail.user_netid && !detail.user_email) {
              console.log(`Listing ${detail.listing_id} has no user info`);
              return false;
            }
            
            const detailNetid = detail.user_netid?.toLowerCase();
            const detailEmail = detail.user_email?.split("@")[0]?.toLowerCase();
            const sellerUsernameLower = sellerUsername.toLowerCase();
            
            const netidMatch = detailNetid === sellerUsernameLower;
            const emailMatch = detailEmail === sellerUsernameLower;
            
            if (netidMatch || emailMatch) {
              console.log(`Listing ${detail.listing_id} matches seller:`, {
                detailNetid,
                detailEmail,
                sellerUsernameLower,
                netidMatch,
                emailMatch
              });
            }
            
            return netidMatch || emailMatch;
          });

        // Include current listing if it's not already in the list (for sold/inactive listings)
        const currentListingId = listing.listing_id;
        const currentListingIncluded = sellerListings.some(l => l.listing_id === currentListingId);
        if (!currentListingIncluded && listing) {
          sellerListings.push(listing);
        }

        if (mounted) {
          const activeCount = sellerListings.filter((l) => l.status === "active").length;
          const soldCount = sellerListings.filter((l) => l.status === "sold").length;
          
          console.log("Seller stats calculated:", {
            sellerUsername,
            totalListings: sellerListings.length,
            activeCount,
            soldCount,
            listingStatuses: sellerListings.map(l => ({ id: l.listing_id, status: l.status }))
          });
          
          setSellerStats({
            activeListings: activeCount,
            soldItems: soldCount,
          });
        }
      } catch (e) {
        console.error("Failed to fetch seller stats:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  // Depend on the listing object reference so this effect runs when the
  // listing is updated. This satisfies the exhaustive-deps rule while
  // preserving current behavior (we only run when listing changes).
  }, [listing]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Posted today";
    if (diffDays === 1) return "Posted yesterday";
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    return `Posted on ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  };


  const handleViewProfile = () => {
    const sellerUsername = listing?.user_netid || listing?.user_email?.split("@")[0];
    console.log("Navigating to seller profile:", {
      sellerUsername,
      user_netid: listing?.user_netid,
      user_email: listing?.user_email,
      listing_id: listing?.listing_id
    });
    if (sellerUsername) {
      // Pass the current listing in state so we can include it in the profile
      navigate(`/seller/${sellerUsername}`, {
        state: { currentListing: listing }
      });
    }
  };

  const handleShare = async () => {
    // Build the listing URL with optional tracking parameter
    const listingUrl = `${window.location.origin}/listing/${id}?ref=share`;

    // Try native share API for mobile first
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Check out this listing: ${listing.title}`,
          url: listingUrl,
        });
        // Don't show toast for native share since it has its own UI
        return;
      } catch (error) {
        // User cancelled or share failed, fall through to clipboard
        if (error.name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    }

    // Fallback to clipboard API
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(listingUrl);
        toast.success("Link copied to clipboard!", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = listingUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          toast.success("Link copied to clipboard!", {
            position: "top-right",
            autoClose: 3000,
          });
        } catch {
          toast.error("Failed to copy link. Please try again.", {
            position: "top-right",
            autoClose: 3000,
          });
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy link. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    if (!listing) return;

    setSaving(true);
    try {
      if (isSaved) {
        await removeFromWatchlist(listing.listing_id);
        setIsSaved(false);
      } else {
        await addToWatchlist(listing.listing_id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
      // Optionally show error message to user
    } finally {
      setSaving(false);
    }
  };

  // Don't render anything if there's no ID (component is just rendered in background on chat page)
  if (!id) {
    return null;
  }
  
  if (loading) {
    return (
      <div className="listing-detail-page">
        <div className="listing-detail-loading">Loading…</div>
      </div>
    );
  }
  
  if (error || !listing) {
    return (
      <div className="listing-detail-page">
        <div className="listing-detail-error">{error || "Not found"}</div>
      </div>
    );
  }

  const hasImages = imagesLength > 0;

  // Image navigation functions - use images array length
  const nextImage = () => {
    if (imagesLength === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % imagesLength);
  };

  const prevImage = () => {
    if (imagesLength === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + imagesLength) % imagesLength);
  };
  const priceDisplay =
    typeof listing.price === "string"
      ? listing.price
      : parseFloat(listing.price).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const statusClass = (listing.status || "").toLowerCase();

  const sellerData = {
    username: listing.user_netid || listing.user_email?.split("@")[0] || "Seller",
    memberSince: listing.created_at || new Date().toISOString(),
    activeListings: sellerStats.activeListings,
    soldItems: sellerStats.soldItems,
    avatarUrl: null,
  };

  return (
    <div className="listing-detail-page">
      {/* Back Button Header */}
      <div className="listing-detail-header">
        <div className="listing-detail-container">
          <button
            className="listing-detail-back-button"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="listing-detail-back-icon" />
            Back to Listings
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="listing-detail-container listing-detail-main">
        <div className="listing-detail-grid">
          {/* Left Column - Image Gallery (60%) */}
          <div className="listing-detail-gallery">
            {/* Main Image with Navigation */}
            <div className="listing-detail-main-image-wrapper">
              <div
                className="listing-detail-main-image"
                onClick={() => hasImages && setLightboxOpen(true)}
                style={{ cursor: hasImages ? "pointer" : "default" }}
              >
                {hasImages ? (
                  <>
                    <img
                      src={images[currentImageIndex].image_url}
                      alt={`${listing.title} - Image ${currentImageIndex + 1}`}
                      loading="lazy"
                    />
                    {/* Image Counter Badge */}
                    {images.length > 1 && (
                      <div className="listing-detail-image-counter">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    )}
                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                      <>
                        <button
                          className="listing-detail-nav-button listing-detail-nav-button--left"
                          onClick={(e) => {
                            e.stopPropagation();
                            prevImage();
                          }}
                          aria-label="Previous image"
                        >
                          <FaChevronLeft />
                        </button>
                        <button
                          className="listing-detail-nav-button listing-detail-nav-button--right"
                          onClick={(e) => {
                            e.stopPropagation();
                            nextImage();
                          }}
                          aria-label="Next image"
                        >
                          <FaChevronRight />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="listing-detail-placeholder">
                    <FaBoxOpen size={80} color="#56018D" />
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="listing-detail-thumbnails">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={`listing-detail-thumbnail ${
                      currentImageIndex === idx
                        ? "listing-detail-thumbnail--active"
                        : ""
                    }`}
                    onClick={() => setCurrentImageIndex(idx)}
                  >
                    <img
                      src={img.image_url}
                      alt={`${listing.title} thumbnail ${idx + 1}`}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Details Sidebar (40%) */}
          <div className="listing-detail-sidebar">
            <div className="listing-detail-details">
              {/* Title with Share Button */}
              <div className="listing-detail-title-container">
                <h1 className="listing-detail-title">{listing.title}</h1>
                <button
                  className="listing-detail-share-button"
                  onClick={handleShare}
                  aria-label="Share listing"
                  title="Share this listing"
                >
                  <FaShareAlt />
                </button>
              </div>

              {/* Price */}
              <div className="listing-detail-price">${priceDisplay}</div>

              {/* Status and Category Badges */}
              <div className="listing-detail-badges">
                <span
                  className={`listing-detail-badge listing-detail-badge--status listing-detail-badge--${statusClass}`}
                >
                  {listing.status}
                </span>
                <span className="listing-detail-badge listing-detail-badge--category">
                  {listing.category}
                </span>
              </div>

              <div className="listing-detail-separator"></div>

              {/* Location */}
              <div className="listing-detail-meta">
                <FaMapMarkerAlt className="listing-detail-meta-icon" />
                <span>{listing.location || "Not specified"}</span>
              </div>

              {/* Posted Date */}
              <div className="listing-detail-meta">
                <FaCalendar className="listing-detail-meta-icon" />
                <span>{formatDate(listing.created_at)}</span>
              </div>

              <div className="listing-detail-separator"></div>

              {/* Description Section */}
              <div className="listing-detail-description-section">
                <h3 className="listing-detail-description-title">Description</h3>
                <p className="listing-detail-description-text">
                  {listing.description ||
                    "No description provided."}
                </p>
              </div>

              <div className="listing-detail-separator"></div>

              {/* Seller Information Card */}
              <SellerCard
                username={sellerData.username}
                memberSince={sellerData.memberSince}
                activeListings={sellerData.activeListings}
                soldItems={sellerData.soldItems}
                avatarUrl={sellerData.avatarUrl}
                onViewProfile={handleViewProfile}
              />

              <div className="listing-detail-separator"></div>

              {/* Action Buttons */}
              <div className="listing-detail-actions">
                <button
                  className="listing-detail-save-button"
                  onClick={handleToggleSave}
                  disabled={saving}
                  title={isSaved ? "Remove from watchlist" : "Save to watchlist"}
                  style={{
                    background: isSaved ? "#dc2626" : "#fff",
                    color: isSaved ? "#fff" : "#56018D",
                    border: `2px solid ${isSaved ? "#dc2626" : "#56018D"}`,
                    padding: "12px 20px",
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "center",
                    transition: "all 0.2s",
                    opacity: saving ? 0.6 : 1,
                  }}
                  onMouseOver={(e) => {
                    if (!saving) {
                      e.target.style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  <FaHeart
                    style={{
                      fill: isSaved ? "#fff" : "transparent",
                      stroke: isSaved ? "#fff" : "#56018D",
                      strokeWidth: 2,
                      transition: "all 0.2s",
                    }}
                  />
                  {isSaved ? "Saved" : "Save"}
                </button>
                <button
                  className="listing-detail-contact-button"
                  onClick={() => setContactModalOpen(true)}
                  disabled={listing.status === "sold"}
                >
                  <FaCommentDots className="listing-detail-contact-icon" />
                  Contact Seller
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Seller Modal */}
      <ContactSellerModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        listingTitle={listing.title}
        listingId={listing.listing_id}
      />

      {/* Lightbox Modal - Fullscreen View */}
      {lightboxOpen && hasImages && (
        <div
          className="listing-detail-lightbox"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="listing-detail-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            <FaTimes />
          </button>
          <div
            className="listing-detail-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[currentImageIndex].image_url}
              alt={listing.title}
            />
            {/* Lightbox Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  className="listing-detail-lightbox-nav listing-detail-lightbox-nav--left"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  aria-label="Previous image"
                >
                  <FaChevronLeft />
                </button>
                <button
                  className="listing-detail-lightbox-nav listing-detail-lightbox-nav--right"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  aria-label="Next image"
                >
                  <FaChevronRight />
                </button>
                {/* Lightbox Image Counter */}
                <div className="listing-detail-lightbox-counter">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky Footer */}
      <div className="listing-detail-mobile-footer">
        <div className="listing-detail-mobile-footer-content">
          <div className="listing-detail-mobile-price">
            <p className="listing-detail-mobile-price-label">Price</p>
            <p className="listing-detail-mobile-price-value">
              ${priceDisplay}
            </p>
          </div>
          <button
            className="listing-detail-mobile-contact-button"
            onClick={() => setContactModalOpen(true)}
            disabled={listing.status === "sold"}
          >
            <FaCommentDots />
            Contact
          </button>
        </div>
      </div>

      {/* Mobile spacing for sticky footer */}
      <div className="listing-detail-mobile-spacer"></div>
    </div>
  );
}

