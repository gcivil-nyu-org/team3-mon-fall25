import React, { useState, useEffect } from "react";
import {
    FaBoxOpen,
    FaChevronLeft,
    FaChevronRight,
    FaMapMarkerAlt,
    FaCalendar,
    FaCommentDots,
    FaTimes,
    FaShareAlt,
    FaHeart,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { getListings, getListing } from "@/api/listings";
import { addToWatchlist, removeFromWatchlist } from "../api/watchlist";
import { useAuth } from "../contexts/AuthContext";
import SellerCard from "./SellerCard";
import ContactSellerModal from "./ContactSellerModal";
import "../pages/ListingDetail.css";

export default function ListingDetailContent({
    listing,
    isPreview = false,
    onViewProfile,
    onShare,
}) {
    const { isAuthenticated } = useAuth();
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
        if (listing) {
            setIsSaved(listing?.is_saved || false);
        }
    }, [listing]);

    // Prepare images array (use listing images or empty array)
    const images = listing?.images && listing.images.length > 0
        ? listing.images
        : [];
    const imagesLength = images.length;

    // Keyboard navigation for lightbox
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

    // Fetch seller stats (active listings and sold items count)
    useEffect(() => {
        if (!listing?.user_netid && !listing?.user_email) return;

        let mounted = true;
        (async () => {
            try {
                const sellerUsername = listing.user_netid || listing.user_email?.split("@")[0];
                if (!sellerUsername) return;

                const allListings = [];
                let page = 1;
                let hasMore = true;

                while (hasMore) {
                    try {
                        const response = await getListings({ page, page_size: 100 });

                        let pageResults = [];
                        let hasNextPage = false;

                        if (Array.isArray(response)) {
                            pageResults = response;
                            hasNextPage = false;
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
                        hasMore = false;
                    }
                }

                // Fetch details for all listings to get user info
                const listingPromises = allListings.map((l) =>
                    getListing(l.listing_id).catch((err) => {
                        console.error(`Failed to fetch listing ${l.listing_id}:`, err);
                        return null;
                    })
                );
                const listingDetails = await Promise.all(listingPromises);

                const sellerUsernameLower = sellerUsername.toLowerCase();
                const sellerListings = listingDetails
                    .filter(Boolean)
                    .filter((detail) => {
                        if (!detail.user_netid && !detail.user_email) return false;

                        const detailNetid = detail.user_netid?.toLowerCase();
                        const detailEmail = detail.user_email?.split("@")[0]?.toLowerCase();

                        return detailNetid === sellerUsernameLower || detailEmail === sellerUsernameLower;
                    });

                // Include current listing if it's not already in the list
                const currentListingId = listing.listing_id;
                const currentListingIncluded = sellerListings.some(l => l.listing_id === currentListingId);
                if (!currentListingIncluded && listing) {
                    sellerListings.push(listing);
                }

                if (mounted) {
                    const activeCount = sellerListings.filter((l) => l.status === "active").length;
                    const soldCount = sellerListings.filter((l) => l.status === "sold").length;

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

    const handleShare = async () => {
        if (onShare) {
            onShare();
            return;
        }

        const listingUrl = `${window.location.origin}/listing/${listing.listing_id}?ref=share`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: listing.title,
                    text: `Check out this listing: ${listing.title}`,
                    url: listingUrl,
                });
                return;
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Share failed:", error);
                }
            }
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(listingUrl);
                toast.success("Link copied to clipboard!", {
                    position: "top-right",
                    autoClose: 3000,
                });
            } else {
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
        } finally {
            setSaving(false);
        }
    };

    if (!listing) {
        return null;
    }

    const hasImages = imagesLength > 0;

    // Image navigation functions
    const nextImage = () => {
        if (imagesLength === 0) return;
        setCurrentImageIndex((prev) => (prev + 1) % imagesLength);
    };

    const prevImage = () => {
        if (imagesLength === 0) return;
        setCurrentImageIndex((prev) => (prev - 1 + imagesLength) % imagesLength);
    };

    // Format price with thousand separators (handles both string and number from API)
    const priceDisplay = parseFloat(listing.price || 0).toLocaleString("en-US", {
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

    const rootClass = `listing-detail-content${isPreview ? " listing-detail-preview" : ""}`;

    return (
        <div className={rootClass}>
            {/* Main Content - Two Column Layout */}
            <div className="listing-detail-container listing-detail-main">
                <div className="listing-detail-grid">
                    {/* Left Column - Image Gallery (60%) */}
                    <div className="listing-detail-gallery">
                        {/* Main Image with Navigation */}
                        <div className="listing-detail-main-image-wrapper">
                            <div
                                className="listing-detail-main-image"
                                onClick={() => !isPreview && hasImages && setLightboxOpen(true)}
                                style={{ cursor: !isPreview && hasImages ? "pointer" : "default" }}
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
                                        className={`listing-detail-thumbnail ${currentImageIndex === idx
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
                                {!isPreview && (
                                    <button
                                        className="listing-detail-share-button"
                                        onClick={handleShare}
                                        aria-label="Share listing"
                                        title="Share this listing"
                                    >
                                        <FaShareAlt />
                                    </button>
                                )}
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
                                <span>{listing.dorm_location || listing.location || "Not specified"}</span>
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
                                onViewProfile={onViewProfile}
                            />

                            <div className="listing-detail-separator"></div>

                            {/* Action Buttons */}
                            {!isPreview && (
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
                                        onClick={() => {
                                            if (!isAuthenticated()) {
                                                return;
                                            }
                                            setContactModalOpen(true);
                                        }}
                                        disabled={listing.status === "sold"}
                                    >
                                        <FaCommentDots className="listing-detail-contact-icon" />
                                        Contact Seller
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Seller Modal */}
            {!isPreview && (
                <ContactSellerModal
                    open={contactModalOpen}
                    onClose={() => setContactModalOpen(false)}
                    listingTitle={listing.title}
                    listingId={listing.listing_id}
                />
            )}

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
        </div>
    );
}

