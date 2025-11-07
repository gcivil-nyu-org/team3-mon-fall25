import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin, Calendar, MessageCircle, X, Bookmark } from 'lucide-react';
import { FaBoxOpen } from "react-icons/fa";
import { getListing, patchListing, deleteListingAPI } from "@/api/listings";
import SellerCard from "@/components/SellerCard";
import "./ListingDetail.css";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [_saving, _setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [_contactModalOpen, _setContactModalOpen] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Posted today';
    if (diffDays === 1) return 'Posted yesterday';
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    return `Posted on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

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

  const _onMarkSold = async (e) => {
    e.stopPropagation();
    if (!listing || listing.status === "sold") return;

    try {
      _setSaving(true);
      // Only send status field for PATCH update
      const updated = await patchListing(listing.listing_id, { status: "sold" });
      setListing(updated); // backend returns fresh record
      window.alert("Listing marked as sold.");
    } catch (e) {
      console.error(e);
      window.alert("Failed to mark as sold.");
    } finally {
      _setSaving(false);
    }
  };

  const handlePrevImage = () => {
  if (!images || images.length === 0) return;
  setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
  if (!images || images.length === 0) return;
  setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const _handleDelete = async (e) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      "Are you sure you want to delete this listing? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      _setSaving(true);
      const success = await deleteListingAPI(listing.listing_id);

      if (success) {
        // Redirect to My Listings page after successful deletion
        navigate("/my-listings");
      } else {
        window.alert("Failed to delete listing. Please try again.");
      }
    } catch (err) {
      console.error("Failed to delete listing:", err);
      window.alert("Failed to delete listing. Please try again.");
    } finally {
      _setSaving(false);
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
  let images = listing.images || [];
  // Provide mock images for local visual testing if none exist.
  // Use multiple providers to avoid network blocks; also add runtime fallback via onError.
  if (!images || images.length === 0) {
    const titleSlug = (listing.title || 'Preview').replace(/\s+/g, '+');
    images = [
      { image_url: `https://placehold.co/900x600?text=${encodeURIComponent(titleSlug)}+1` },
      { image_url: `https://picsum.photos/seed/${encodeURIComponent(titleSlug)}-2/900/600` },
      { image_url: `https://placehold.co/900x600?text=${encodeURIComponent(titleSlug)}+3` }
    ];
  }
  const hasImages = images.length > 0;

  const handleImgError = (e, idx) => {
    const current = e.currentTarget;
    const attempted = Number(current.getAttribute('data-fb-attempt') || '0');
    // Two-step fallback: placehold.co then picsum then inline SVG
    const fallbacks = [
      `https://placehold.co/900x600?text=${encodeURIComponent((listing.title||'Image')+' '+(idx+1))}`,
      `https://picsum.photos/seed/fallback-${idx}/900/600`,
      `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#F5F5F5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#56018D" font-family="Arial" font-size="36">Image '+(idx+1)+'</text></svg>')}`
    ];
    if (attempted < fallbacks.length) {
      current.setAttribute('data-fb-attempt', String(attempted + 1));
      current.src = fallbacks[attempted];
    }
  };

  return (
    <div className="listing-detail-page">
      {/* Back Button Header */}
      <div className="bg-white border-b border-[#E5E5E5] sticky top-16 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <button
            onClick={() => navigate('/browse')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft /> Back to Listings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="listing-detail-container">
        {/* Left Column - Image Gallery */}
        <div className="image-gallery">
          <div className="main-image">
            {hasImages ? (
              <>
                <img
                  src={images[currentImageIndex].image_url}
                  alt={`${listing.title} - Image ${currentImageIndex + 1}`}
                  onClick={() => setLightboxOpen(true)}
                  loading="lazy"
                  onError={(e) => handleImgError(e, currentImageIndex)}
                />
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="nav-arrow prev"
                      onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={32} />
                    </button>
                    <button
                      type="button"
                      className="nav-arrow next"
                      onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                      aria-label="Next image"
                    >
                      <ChevronRight size={32} />
                    </button>
                  </>
                )}
                {/* Bookmark button (optional, can be added later) */}
                <div className="image-counter">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            ) : (
              <FaBoxOpen size={80} color="#5A2D82" />
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="thumbnail-strip">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`thumbnail ${currentImageIndex === idx ? 'active' : ''}`}
                >
                  <img
                    src={img.image_url}
                    alt={`${listing.title} thumbnail ${idx + 1}`}
                    loading="lazy"
                    onError={(e) => handleImgError(e, idx)}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Details Sidebar */}
        <div className="details-sidebar">
          <h1 className="listing-title">{listing.title}</h1>
          
          <p className="listing-price">${priceDisplay}</p>
          
          <div className="flex gap-2">
            <span className={`listing-status ${statusClass}`}>
              {listing.status}
            </span>
            <span className="bg-[#F3E8FF] text-[#56018D] px-3 py-1 rounded-lg">
              {listing.category}
            </span>
          </div>

          <div className="listing-info">
            <div className="info-row">
              <MapPin className="w-5 h-5" />
              {listing.dorm || 'Location not specified'}
            </div>
            <div className="info-row">
              <Calendar className="w-5 h-5" />
              {formatDate(listing.created_at)}
            </div>
          </div>

          <div className="listing-description">
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <p>{listing.description}</p>
          </div>

          <SellerCard
            username={listing.seller_username || listing.user_netid || listing.user_email?.split('@')[0]}
            displayName={listing.seller_display_name}
            memberSince={listing.seller_member_since || listing.created_at}
            activeListingsCount={listing.seller_active_listings_count}
            totalSoldCount={listing.seller_total_sold_count}
          />

          <div className="listing-actions">
            <button
              className="btn-contact"
              disabled={listing.status === "sold"}
              onClick={() => _setContactModalOpen(true)}
            >
              <MessageCircle className="w-5 h-5" />
              Contact Seller
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      {/* Removed unnecessary bit at the end as requested */}

      {/* Lightbox */}
      {lightboxOpen && hasImages && (
        <div 
          className="lightbox"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="lightbox-close"
            aria-label="Close lightbox"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="relative w-full h-full flex items-center justify-center p-8">
            <img
              src={images[currentImageIndex].image_url}
              alt={listing.title}
              className="lightbox-image"
              onClick={(e) => e.stopPropagation()}
              loading="lazy"
            />

            {/* Lightbox Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="lightbox-nav prev"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="lightbox-nav next"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>

                <div className="lightbox-counter">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
