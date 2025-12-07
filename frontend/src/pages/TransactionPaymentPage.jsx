import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./TransactionPaymentPage.css";

import client from "../api/client";
import { getListing } from "../api/listings";
import { getTransaction } from "../api/transactions";
import { useAuth } from "../contexts/AuthContext";

import {
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Send,
  Info,
  ChevronDown,
  Heart,
  Banknote,
  ArrowRightLeft,
} from "lucide-react";

// --- Constants & Data ---

const LOCATIONS = [
  "Bobst Library - 1st Floor",
  "Bobst Library - Lobby",
  "Tandon School of Engineering",
  "Kimmel Center - Lounge",
  "Washington Square Park - Arch",
  "Palladium Hall - Lobby",
  "Lipton Hall - Lobby",
  "Third North - Lobby",
  "Founders Hall - Lobby",
  "Stern School of Business - Lobby",
  "Other (specify in chat)",
];

// --- Sub-Components ---
const Header = ({ status = "PENDING" }) => (
  <div className="header-container">
    <div className="header-status-row">
      <div className="header-status-spacer" />
      <div className={`status-badge status-${status.toLowerCase()}`}>
        STATUS: {status.toUpperCase()}
      </div>
    </div>
  </div>
);

const TransactionDetailsCard = ({
  listing,
  status,
  viewerRole,
  buyerLabel,
}) => {
  const imageUrl =
    listing?.primary_image?.url ||
    listing?.images?.[0]?.image_url ||
    listing?.images?.[0]?.url ||
    listing?.primary_image ||
    listing?.images?.[0] ||
    listing?.thumbnail_url;

  const sellerLabel =
    listing?.user_netid || listing?.user_email?.split("@")[0] || "Seller";

  const formattedPrice =
    listing?.price != null
      ? `$${Number(listing.price).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "--";

  const isBuyerView = viewerRole === "buyer";
  const isSellerView = viewerRole === "seller";

  return (
    <div className="card card-padding details-card-inner">
      <div className="pending-badge">
        {status ? status.toUpperCase() : "PENDING"}
      </div>

      <div className="item-image-container">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing?.title || "Listing"}
            className="item-image"
          />
        ) : (
          <div className="item-image placeholder" />
        )}
      </div>

      <div className="item-info">
        <h2 className="item-title">
          {listing?.title || "Listing title loading…"}
        </h2>
        {listing?.description && (
          <p className="item-desc">{listing.description}</p>
        )}

        <div className="item-price-row">
          <span className="price-tag">{formattedPrice}</span>
          <div className="participants-info">
            <p>
              <span>Seller:</span> {isSellerView ? "You" : sellerLabel}
            </p>
            <p>
              <span>Buyer:</span> {isBuyerView ? "You" : buyerLabel || "Buyer"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentOption = ({ id, label, subLabel, icon, selected, onSelect }) => (
  <div
    onClick={() => onSelect(id)}
    className={`payment-option ${selected ? "selected" : ""}`}
  >
    <div className="payment-icon">{icon}</div>
    <div className="payment-details">
      <p className="payment-label">{label}</p>
      <p className="payment-sublabel">{subLabel}</p>
    </div>
    {selected && <div className="active-indicator" />}
  </div>
);

const TimelineItem = ({ title, desc, status, isLast }) => {
  const isCompleted = status === "completed";
  const isCurrent = status === "current";

  return (
    <div className="timeline-item">
      {!isLast && (
        <div className={`timeline-line ${isCompleted ? "completed" : ""}`} />
      )}
      <div className={`timeline-dot ${status}`}>
        {isCompleted ? (
          <CheckCircle2 size={14} />
        ) : isCurrent ? (
          <Clock size={14} />
        ) : (
          <Circle size={14} />
        )}
      </div>
      <div className="timeline-content">
        <p className={`timeline-title ${status}`}>{title}</p>
        <p className="timeline-desc">{desc}</p>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function TransactionPaymentPage() {
  // route: /transaction/:id
  const { id } = useParams();
  const transactionId = id;
  const { user } = useAuth();

  const [viewerRole, setViewerRole] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [listing, setListing] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("venmo");
  const [deliveryType, setDeliveryType] = useState("meetup");
  const [location, setLocation] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [buyerEditing, setBuyerEditing] = useState(false);
  const [sellerEditing, setSellerEditing] = useState(false);

  const isBuyerView = viewerRole === "buyer";
  const isSellerView = viewerRole === "seller";

  const buyerLabel =
    transaction?.buyer_netid ||
    transaction?.buyer_email?.split("@")[0] ||
    transaction?.buyer;

  // ---- Meeting time helpers ----
  const isMeetingTimeTooSoon = () => {
    if (!meetingTime) return true;

    const selected = new Date(meetingTime);
    if (isNaN(selected.getTime())) return true;

    const min = new Date();
    min.setHours(min.getHours() + 1);

    return selected < min;
  };

  const [minMeetingTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  // Decide buyer's initial isConfirmed / buyerEditing based on backend status
  useEffect(() => {
    if (!transaction || viewerRole !== "buyer") return;

    const normalized = (transaction.status || "").toUpperCase();
    const proposedBy = transaction.proposed_by; // "buyer" | "seller" | null

    setBuyerEditing(false);
    setIsConfirmed(false);

    // PENDING with no proposal => let buyer edit immediately on first load
    if (normalized === "PENDING" && !proposedBy) {
      setBuyerEditing(true);
      return;
    }

    // NEGOTIATING: there is a proposal
    if (normalized === "NEGOTIATING" && proposedBy) {
      // Show summary for any proposer, but buyer starts in view mode
      setBuyerEditing(false);
      return;
    }

    // SCHEDULED / COMPLETED: treat as finalized; do not auto-open editing
    if (normalized === "SCHEDULED" || normalized === "COMPLETED") {
      setBuyerEditing(false);
    }
  }, [transaction, viewerRole]);

  // ---- Load transaction + listing ----
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError("");

        const tx = await getTransaction(transactionId);
        if (cancelled) return;

        setTransaction(tx);

        let role = tx.viewer_role || null;

        if (!role && user) {
          const rawUserId = user.id ?? user.user_id;
          if (rawUserId != null) {
            const userIdStr = String(rawUserId);
            if (String(tx.buyer) === userIdStr) {
              role = "buyer";
            } else if (String(tx.seller) === userIdStr) {
              role = "seller";
            }
          }
        }

        setViewerRole(role);
        setPaymentMethod(tx.payment_method || "venmo");
        setDeliveryType(tx.delivery_method || "meetup");
        setLocation(tx.meet_location || "");

        if (tx.meet_time) {
          setMeetingTime(tx.meet_time.slice(0, 16));
        } else {
          setMeetingTime("");
        }

        const listingId = tx.listing;
        if (listingId) {
          try {
            const listingData = await getListing(listingId);
            if (!cancelled) setListing(listingData);
          } catch (err) {
            if (!cancelled) {
              console.error("Failed to load listing", err);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError("Failed to load transaction.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (transactionId) {
      fetchData();
    } else {
      setLoading(false);
      setError("Missing transaction id.");
    }

    return () => {
      cancelled = true;
    };
  }, [transactionId, user]);

  const mapStatusToStep = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return "initiated";
      case "NEGOTIATING":
        return "negotiating";
      case "SCHEDULED":
        return "scheduled";
      case "COMPLETED":
        return "completed";
      default:
        return "initiated";
    }
  };

  const currentStep = mapStatusToStep(transaction?.status);
  const stepOrder = ["initiated", "negotiating", "scheduled", "completed"];

  const getStepStatus = (stepName) => {
    const idx = stepOrder.indexOf(stepName);
    const currentIdx = stepOrder.indexOf(currentStep);
    if (idx < currentIdx) return "completed";
    if (idx === currentIdx) return "current";
    return "upcoming";
  };

  // ---- Buyer: send a new proposal (update details) ----
  const handleBuyerSendProposal = async () => {
    if (!transaction) return;

    if (!location || !meetingTime) {
      setError("Please choose a location and meeting time.");
      return;
    }

    if (isMeetingTimeTooSoon()) {
      setError("Meeting time must be at least 1 hour from now.");
      return;
    }

    setIsSaving(true);
    setError("");

    const txId = transaction.transaction_id || transaction.id || transactionId;

    try {
      await client.patch(`/transactions/${txId}/payment-method/`, {
        payment_method: paymentMethod,
      });

      const payload = {
        delivery_method: deliveryType,
      };

      if (deliveryType === "meetup") {
        payload.meet_location = location;
        payload.meet_time = new Date(meetingTime).toISOString();
      } else {
        payload.meet_location = location || null;
        payload.meet_time = meetingTime
          ? new Date(meetingTime).toISOString()
          : null;
      }

      const res = await client.patch(
        `/transactions/${txId}/delivery-details/`,
        payload
      );
      setTransaction(res.data);
      setBuyerEditing(false);
    } catch (e) {
      console.error(e);
      const apiError =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        "Failed to save changes.";
      setError(apiError);
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Confirm current proposal (shared by both roles) ----
  const handleConfirmCurrentDetails = async () => {
    if (!transaction) return;

    const txId = transaction.transaction_id || transaction.id || transactionId;

    setIsSaving(true);
    setError("");

    try {
      const res = await client.patch(`/transactions/${txId}/confirm/`);
      setTransaction(res.data);
      setIsConfirmed(false);
      setBuyerEditing(false);
      setSellerEditing(false);
    } catch (e) {
      console.error(e);
      const apiError =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        "Failed to confirm transaction.";
      setError(apiError);
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Seller: mark as sold ----
  const handleMarkAsSold = async () => {
    if (!transaction) return;

    const txId = transaction.transaction_id || transaction.id || transactionId;

    setIsSaving(true);
    setError("");

    try {
      const res = await client.patch(`/transactions/${txId}/mark-sold/`);
      setTransaction(res.data);
      setBuyerEditing(false);
      setSellerEditing(false);
    } catch (e) {
      console.error(e);
      const apiError =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        "Failed to mark as sold.";
      setError(apiError);
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Seller: Request new details ----
  const handleSellerSendProposal = async () => {
    if (!transaction) return;

    if (!location || !meetingTime) {
      setError("Please choose a location and meeting time.");
      return;
    }

    if (isMeetingTimeTooSoon()) {
      setError("Meeting time must be at least 1 hour from now.");
      return;
    }

    setIsSaving(true);
    setError("");

    const txId = transaction.transaction_id || transaction.id || transactionId;

    const payload = {
      delivery_method: transaction.delivery_method || deliveryType || "meetup",
      meet_location: location,
      meet_time: new Date(meetingTime).toISOString(),
    };

    try {
      const res = await client.patch(
        `/transactions/${txId}/delivery-details/`,
        payload
      );
      setTransaction(res.data);
      setSellerEditing(false);
    } catch (e) {
      console.error(e);
      const apiError =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        "Failed to send new proposal.";
      setError(apiError);
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Buyer: suggest new details ----
  const handleBuyerSuggestNewDetails = () => {
    setBuyerEditing(true);
    setIsConfirmed(false);
    setError("");
  };

  // ---- Seller: suggest new details ----
  const handleSellerSuggestNewDetails = () => {
    setSellerEditing((prev) => !prev);
    setError("");
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    // TODO: Connect chat APIs (chat will be removed later; handler kept to avoid errors)
    setChatInput("");
  };

  const status = transaction?.status || "PENDING";
  const normalizedStatus = (status || "").toUpperCase();

  const hasProposal = !!transaction?.proposed_by;
  const proposedByBuyer = transaction?.proposed_by === "buyer";
  const proposedBySeller = transaction?.proposed_by === "seller";
  const proposedBy = transaction?.proposed_by;

  // Helper for summary fields
  const paymentSummary =
    (transaction?.payment_method || paymentMethod || "").toUpperCase() || "--";
  const deliveryRaw =
    (transaction?.delivery_method || deliveryType || "") || "";
  const deliverySummary =
    deliveryRaw.charAt(0).toUpperCase() + deliveryRaw.slice(1);
  const locationSummary =
    transaction?.meet_location || location || "Location not set";
  const timeSummary = (() => {
    const iso = transaction?.meet_time || meetingTime;
    if (!iso) return "Time not set";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Time not set";
    return d.toLocaleString();
  })();

  // Show Suggest button unless status is COMPLETED
  const canShowSuggestButton =
    normalizedStatus !== "COMPLETED" &&
    (isSellerView ||
      (isBuyerView && (isConfirmed || hasProposal || normalizedStatus === "SCHEDULED")));

  const canBuyerConfirm =
    isBuyerView && proposedBySeller && normalizedStatus === "NEGOTIATING";

  const canSellerConfirm =
    isSellerView &&
    proposedByBuyer &&
    !["SCHEDULED", "COMPLETED"].includes(normalizedStatus);

  const canSellerMarkSold =
    isSellerView && normalizedStatus === "SCHEDULED";

  const showBuyerSummary = normalizedStatus !== "COMPLETED";

  const showSellerSummary =
    hasProposal || normalizedStatus === "SCHEDULED";

  return (
    <div className="transaction-page-container">
      <Header status={status} />

      <main className="main-content">
        <div className="content-grid">
          {/* Left Column (Main Content) */}
          <div className="left-column">
            <TransactionDetailsCard
              listing={listing}
              status={status}
              viewerRole={viewerRole}
              buyerLabel={buyerLabel}
            />

            {/* Proposal Card */}
            <div className="card">
              <div className="card-header">
                <h3>Transaction Proposal</h3>
                {canShowSuggestButton && (
                  <button
                    type="button"
                    className="suggest-details-btn"
                    onClick={
                      isSellerView
                        ? handleSellerSuggestNewDetails
                        : handleBuyerSuggestNewDetails
                    }
                  >
                    Suggest new details
                  </button>
                )}
              </div>

              <div className="card-padding">
                {loading && (
                  <p className="tx-helper-text">Loading transaction…</p>
                )}
                {error && (
                  <p className="tx-error-text" data-testid="tx-error">
                    {error}
                  </p>
                )}

                {isBuyerView ? (
                  // ============================
                  // BUYER VIEW
                  // ============================
                  <>
                    {/* Buyer Summary: show when there is a proposal or status is SCHEDULED */}
                    {showBuyerSummary && (
                      <div
                        className="proposal-summary"
                        style={{
                          background: "#FFFBEB",
                          border: "1px solid #FACC15",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "999px",
                              background: "#FEF3C7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Info size={14} color="#D97706" />
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0 }}>
                              {normalizedStatus === "SCHEDULED"
                                ? "Meetup scheduled."
                                : proposedByBuyer
                                ? "You proposed these details."
                                : "Seller proposed new details to you."}
                            </p>
                            <p
                              style={{
                                fontSize: "0.85rem",
                                color: "#6B7280",
                                margin: 0,
                              }}
                            >
                              {normalizedStatus === "SCHEDULED"
                                ? "These details are confirmed. If something changes, you or the seller can suggest new details."
                                : proposedByBuyer
                                ? "Waiting for seller to accept or suggest changes."
                                : "Waiting for you to accept the proposal or suggest changes."}
                            </p>
                          </div>
                        </div>

                        <div style={{ marginBottom: "4px" }}>
                          <strong>Payment:</strong>{" "}
                          <span>{paymentSummary}</span>
                        </div>
                        <div style={{ marginBottom: "4px" }}>
                          <strong>Delivery:</strong>{" "}
                          <span>{deliverySummary}</span>
                        </div>
                        <div style={{ marginBottom: "4px" }}>
                          <strong>Location:</strong>{" "}
                          <span>{locationSummary}</span>
                        </div>
                        <div>
                          <strong>Time:</strong>{" "}
                          <span>{timeSummary}</span>
                        </div>
                      </div>
                    )}

                    {/* Buyer form: only visible after clicking Suggest new details */}
                    {buyerEditing &&
                      normalizedStatus !== "COMPLETED" && (
                        <>
                          {/* Payment Method Section */}
                          <div className="section-group">
                            <label className="section-label">
                              Payment Method
                            </label>
                            <div className="options-stack">
                              <PaymentOption
                                id="venmo"
                                label="Venmo"
                                subLabel="Send via Venmo"
                                icon={
                                  <Heart
                                    size={18}
                                    color={
                                      paymentMethod === "venmo"
                                        ? "#60a5fa"
                                        : "#3b82f6"
                                    }
                                    fill={
                                      paymentMethod === "venmo"
                                        ? "#60a5fa"
                                        : "#3b82f6"
                                    }
                                  />
                                }
                                selected={paymentMethod === "venmo"}
                                onSelect={setPaymentMethod}
                              />
                              <PaymentOption
                                id="zelle"
                                label="Zelle"
                                subLabel="Send via Zelle"
                                icon={
                                  <div
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: 2,
                                      backgroundColor: "#9333ea",
                                    }}
                                  />
                                }
                                selected={paymentMethod === "zelle"}
                                onSelect={setPaymentMethod}
                              />
                              <PaymentOption
                                id="cash"
                                label="Cash"
                                subLabel="Pay in person"
                                icon={<Banknote size={18} color="#16a34a" />}
                                selected={paymentMethod === "cash"}
                                onSelect={setPaymentMethod}
                              />
                            </div>
                          </div>

                          {/* Delivery Details Section */}
                          <div className="section-group">
                            <label className="section-label">
                              Delivery Details
                            </label>
                            <div className="delivery-toggle-container">
                              <button
                                onClick={() => setDeliveryType("meetup")}
                                className={`toggle-option ${
                                  deliveryType === "meetup"
                                    ? "active"
                                    : "inactive"
                                }`}
                              >
                                <ArrowRightLeft size={14} />
                                Meetup
                              </button>
                              <button
                                onClick={() => setDeliveryType("pickup")}
                                className={`toggle-option ${
                                  deliveryType === "pickup"
                                    ? "active"
                                    : "inactive"
                                }`}
                              >
                                <MapPin size={14} />
                                Pickup
                              </button>
                            </div>
                          </div>

                          {/* Location Dropdown */}
                          <div className="section-group">
                            <label className="section-label">
                              {deliveryType === "meetup"
                                ? "Meeting Location"
                                : "Pickup Location"}
                            </label>

                            <div className="location-dropdown-wrapper">
                              <button
                                onClick={() =>
                                  setIsDropdownOpen(!isDropdownOpen)
                                }
                                className={`dropdown-trigger ${
                                  isDropdownOpen ? "open" : ""
                                }`}
                              >
                                <span
                                  style={{
                                    color: location ? "#111827" : "#6b7280",
                                    fontWeight: location ? 500 : 400,
                                  }}
                                >
                                  {location || "Choose a location"}
                                </span>
                                <ChevronDown
                                  size={16}
                                  color="#9ca3af"
                                  style={{
                                    transform: isDropdownOpen
                                      ? "rotate(180deg)"
                                      : "none",
                                    transition: "transform 0.2s",
                                  }}
                                />
                              </button>

                              {isDropdownOpen && (
                                <div className="dropdown-menu">
                                  {LOCATIONS.map((loc) => (
                                    <div
                                      key={loc}
                                      onClick={() => {
                                        setLocation(loc);
                                        setIsDropdownOpen(false);
                                      }}
                                      className="dropdown-item"
                                    >
                                      {loc}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Meeting Time */}
                          <div className="section-group">
                            <label className="section-label">
                              Meeting Time
                            </label>
                            <input
                              type="datetime-local"
                              className="input-field"
                              value={meetingTime}
                              onChange={(e) => {
                                setMeetingTime(e.target.value);
                                setError("");
                              }}
                              min={minMeetingTime}
                            />

                            <div className="helper-text">
                              <Info size={12} />
                              <span>
                                Meeting time must be at least 1 hour from now.
                              </span>
                            </div>
                          </div>

                          {/* Buyer: Send new proposal */}
                          <button
                            onClick={handleBuyerSendProposal}
                            disabled={
                              isSaving ||
                              !transaction ||
                              !location ||
                              !meetingTime ||
                              isMeetingTimeTooSoon()
                            }
                            className="save-btn"
                            style={{ marginBottom: "12px" }}
                          >
                            {isSaving ? (
                              <>
                                <div className="spinner" />
                                Sending proposal...
                              </>
                            ) : (
                              "Send new proposal"
                            )}
                          </button>
                        </>
                      )}

                    {/* Buyer: Confirm current proposal (shown only when seller proposed) */}
                    {canBuyerConfirm && (
                      <button
                        onClick={handleConfirmCurrentDetails}
                        disabled={isSaving}
                        className="save-btn"
                      >
                        {isSaving ? (
                          <>
                            <div className="spinner" />
                            Confirming...
                          </>
                        ) : (
                          "Confirm Details"
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  // ============================
                  // SELLER VIEW
                  // ============================
                  <>
                    {/* Seller Summary: show when there is a proposal or status is SCHEDULED; if PENDING with no proposal show a brief tip */}
                    {showSellerSummary ? (
                      <div
                        className="proposal-summary"
                        style={{
                          background: "#FFFBEB",
                          border: "1px solid #FACC15",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "999px",
                              background: "#FEF3C7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Info size={14} color="#D97706" />
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0 }}>
                              {normalizedStatus === "SCHEDULED"
                                ? "Meetup scheduled."
                                : proposedBy === "buyer"
                                ? "Buyer proposed new details."
                                : "You proposed new details to the buyer."}
                            </p>
                            <p
                              style={{
                                fontSize: "0.85rem",
                                color: "#6B7280",
                                margin: 0,
                              }}
                            >
                              {normalizedStatus === "SCHEDULED"
                                ? "These details are confirmed. You can still suggest changes if needed."
                                : proposedBy === "buyer"
                                ? "Review the proposal and confirm if it works for you."
                                : "Waiting for buyer to accept or suggest changes."}
                            </p>
                          </div>
                        </div>

                        <div style={{ marginBottom: "4px" }}>
                          <strong>Payment:</strong>{" "}
                          <span>{paymentSummary}</span>
                        </div>

                        <div style={{ marginBottom: "4px" }}>
                          <strong>Delivery:</strong>{" "}
                          <span>{deliverySummary}</span>
                        </div>

                        <div style={{ marginBottom: "4px" }}>
                          <strong>Location:</strong>{" "}
                          <span>{locationSummary}</span>
                        </div>

                        <div>
                          <strong>Time:</strong>{" "}
                          <span>{timeSummary}</span>
                        </div>
                      </div>
                    ) : (
                      normalizedStatus === "PENDING" && (
                        <p className="tx-helper-text" style={{ marginBottom: 16 }}>
                          No details proposed yet. Once the buyer suggests a meetup
                          time and place, you&apos;ll see them here.
                        </p>
                      )
                    )}

                    {sellerEditing && normalizedStatus !== "COMPLETED" && (
                      <>
                        <div className="section-group">
                          <label className="section-label">
                            Meeting Location
                          </label>

                          <div className="location-dropdown-wrapper">
                            <button
                              onClick={() =>
                                setIsDropdownOpen(!isDropdownOpen)
                              }
                              className={`dropdown-trigger ${
                                isDropdownOpen ? "open" : ""
                              }`}
                            >
                              <span
                                style={{
                                  color: location ? "#111827" : "#6b7280",
                                  fontWeight: location ? 500 : 400,
                                }}
                              >
                                {location || "Choose a location"}
                              </span>
                              <ChevronDown
                                size={16}
                                color="#9ca3af"
                                style={{
                                  transform: isDropdownOpen
                                    ? "rotate(180deg)"
                                    : "none",
                                  transition: "transform 0.2s",
                                }}
                              />
                            </button>

                            {isDropdownOpen && (
                              <div className="dropdown-menu">
                                {LOCATIONS.map((loc) => (
                                  <div
                                    key={loc}
                                    onClick={() => {
                                      setLocation(loc);
                                      setIsDropdownOpen(false);
                                    }}
                                    className="dropdown-item"
                                  >
                                    {loc}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="section-group">
                          <label className="section-label">
                            Meeting Time
                          </label>
                          <input
                            type="datetime-local"
                            className="input-field"
                            value={meetingTime}
                            onChange={(e) => {
                              setMeetingTime(e.target.value);
                              setError("");
                            }}
                            min={minMeetingTime}
                          />

                          <div className="helper-text">
                            <Info size={12} />
                            <span>
                              Meeting time must be at least 1 hour from now.
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleSellerSendProposal}
                          disabled={isSaving}
                          className="save-btn"
                          style={{ marginBottom: "12px" }}
                        >
                          {isSaving ? (
                            <>
                              <div className="spinner" />
                              Sending proposal...
                            </>
                          ) : (
                            "Send new proposal"
                          )}
                        </button>
                      </>
                    )}

                    {/* Seller Confirm (only when buyer proposed) */}
                    {canSellerConfirm && (
                      <button
                        onClick={handleConfirmCurrentDetails}
                        disabled={isSaving}
                        className="save-btn"
                      >
                        {isSaving ? (
                          <>
                            <div className="spinner" />
                            Confirming...
                          </>
                        ) : (
                          "Confirm Details"
                        )}
                      </button>
                    )}

                    {/* Seller: Mark as sold (when status is SCHEDULED) */}
                    {canSellerMarkSold && (
                      <button
                        onClick={handleMarkAsSold}
                        disabled={isSaving}
                        className="save-btn"
                        style={{ marginTop: "12px" }}
                      >
                        {isSaving ? (
                          <>
                            <div className="spinner" />
                            Marking as sold...
                          </>
                        ) : (
                          "Mark as sold"
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="right-column">
            {/* Progress Card */}
            <div className="card card-padding">
              <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                  Progress
                </h3>
              </div>
              <div className="timeline-container">
                <TimelineItem
                  title="Initiated"
                  desc="Transaction started"
                  status={getStepStatus("initiated")}
                />
                <TimelineItem
                  title="Negotiating"
                  desc="Setting up details"
                  status={getStepStatus("negotiating")}
                />
                <TimelineItem
                  title="Scheduled"
                  desc="Ready to exchange"
                  status={getStepStatus("scheduled")}
                />
                <TimelineItem
                  title="Completed"
                  desc="Item sold"
                  status={getStepStatus("completed")}
                  isLast
                />
              </div>
            </div>

            {/* Chat Card removed */}
          </div>
        </div>
      </main>
    </div>
  );
}
