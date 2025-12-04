import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaCommentDots } from "react-icons/fa";
import { getListing, patchListing, deleteListingAPI } from "@/api/listings";
import { createTransaction } from "@/api/transactions";
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
    const [creatingTx, setCreatingTx] = useState(false);

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
        if (!isAuthenticated) {
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

    const handleEditListing = () => {
        navigate(`/listing/${id}/edit`);
    };

    const handleMarkAsSold = async () => {
        if (!listing) return;

        const confirmed = window.confirm(
            "Are you sure you want to mark this listing as sold?"
        );

        if (!confirmed) return;

        try {
            await patchListing(id, { status: "sold" });
            // Update local state
            setListing((prev) => ({ ...prev, status: "sold" }));
        } catch (err) {
            console.error("Failed to mark as sold:", err);
            alert("Failed to mark as sold. Please try again.");
        }
    };

    const handleDeleteListing = async () => {
        if (!listing) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this listing? This action cannot be undone."
        );

        if (!confirmed) return;

        try {
            const success = await deleteListingAPI(id);

            if (success) {
                // Navigate back to my listings page after successful deletion
                navigate("/my-listings");
            } else {
                alert("Failed to delete listing. Please try again.");
            }
        } catch (err) {
            console.error("Failed to delete listing:", err);
            alert("Failed to delete listing. Please try again.");
        }
    };

    const handleBuyNow = async () => {
        if (!listing) return;

        if (creatingTx) return;

        // Check if user is authenticated
        if (!isAuthenticated) {
            navigate("/login", {
                state: { from: location },
            });
            return;
        }

        try {
            setCreatingTx(true);

            // Create a transaction for this listing
            const transaction = await createTransaction(id);

            const txId = transaction.transaction_id || transaction.id;
            if (!txId) {
                throw new Error("Missing transaction id from response");
            }

            // Redirect to transaction payment page
            navigate(`/transaction/${transaction.transaction_id}`);
        } catch (err) {
            console.error("Failed to create transaction:", err);
            alert("Failed to initiate purchase. Please try again.");
        } finally {
            setCreatingTx(false);
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
                onEditListing={handleEditListing}
                onMarkAsSold={handleMarkAsSold}
                onDeleteListing={handleDeleteListing}
                onBuyNow={handleBuyNow}
                isBuying={creatingTx}
            />

            {/* Mobile Sticky Footer */}
            <div className="listing-detail-mobile-footer">
                <div className="listing-detail-mobile-footer-content">
                    {listing.is_owner ? (
                        // Owner view - show action buttons
                        <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                            <button
                                className="listing-detail-mobile-contact-button"
                                onClick={handleEditListing}
                                style={{
                                    background: "#56018D",
                                    flex: 1,
                                    fontSize: "14px",
                                    padding: "10px"
                                }}
                            >
                                Edit
                            </button>
                            {listing.status !== "sold" && (
                                <button
                                    className="listing-detail-mobile-contact-button"
                                    onClick={handleMarkAsSold}
                                    style={{
                                        background: "#059669",
                                        flex: 1,
                                        fontSize: "14px",
                                        padding: "10px"
                                    }}
                                >
                                    Sold
                                </button>
                            )}
                            <button
                                className="listing-detail-mobile-contact-button"
                                onClick={handleDeleteListing}
                                style={{
                                    background: "#dc2626",
                                    flex: 1,
                                    fontSize: "14px",
                                    padding: "10px"
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    ) : (
                        // Non-owner view - show price and contact/buy buttons
                        <>
                            <div className="listing-detail-mobile-price">
                                <p className="listing-detail-mobile-price-label">Price</p>
                                <p className="listing-detail-mobile-price-value">
                                    ${parseFloat(listing.price || 0).toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                                <button
                                    className="listing-detail-mobile-contact-button"
                                    onClick={() => {
                                        if (!isAuthenticated) {
                                            navigate("/login", {
                                                state: { from: location },
                                            });
                                        }
                                    }}
                                    disabled={listing.status === "sold"}
                                    style={{ flex: 1, fontSize: "14px", padding: "10px" }}
                                >
                                    <FaCommentDots />
                                    Contact
                                </button>
                                <button
                                    className="listing-detail-mobile-contact-button"
                                    onClick={handleBuyNow}
                                    disabled={listing.status === "sold" || creatingTx}
                                    style={{
                                        flex: 1,
                                        fontSize: "14px",
                                        padding: "10px",
                                        background: "#059669"
                                    }}
                                >
                                    {creatingTx ? "Processing..." : "Buy"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile spacing for sticky footer */}
            <div className="listing-detail-mobile-spacer"></div>
        </div>
    );
}

