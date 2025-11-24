import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaCommentDots } from "react-icons/fa";
import { getListing } from "@/api/listings";
import { useAuth } from "../contexts/AuthContext";
import ListingDetailContent from "../components/ListingDetailContent";
import "./ListingDetail.css";

export default function ListingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();


    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    const handleViewProfile = () => {
        const sellerUsername =
            listing?.user_netid || listing?.user_email?.split("@")[0];

        if (!sellerUsername) return;

        // If not logged in, send to login and remember intended destination
        if (!isAuthenticated()) {
            navigate("/login", {
                replace: false,
                state: {
                    from: { pathname: `/seller/${sellerUsername}` },
                },
            });
            return;
        }

        // Logged in → go to seller profile as before
        navigate(`/seller/${sellerUsername}`, {
            state: { currentListing: listing },
        });
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

            <ListingDetailContent
                listing={listing}
                isPreview={false}
                onViewProfile={handleViewProfile}
            />

            {/* Mobile Sticky Footer */}
            <div className="listing-detail-mobile-footer">
                <div className="listing-detail-mobile-footer-content">
                    <div className="listing-detail-mobile-price">
                        <p className="listing-detail-mobile-price-label">Price</p>
                        <p className="listing-detail-mobile-price-value">
                            ${parseFloat(listing.price || 0).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </p>
                    </div>
                    <button
                        className="listing-detail-mobile-contact-button"
                        onClick={() => {
                            if (!isAuthenticated()) {
                                navigate("/login", {
                                    state: { from: location },
                                });
                            }
                        }}
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

