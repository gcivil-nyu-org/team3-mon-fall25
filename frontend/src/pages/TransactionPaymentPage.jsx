import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./TransactionPaymentPage.css";

import client from "../api/client";
import { getListing } from "../api/listings";
import { getTransaction } from "../api/transactions";

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

const TransactionDetailsCard = ({ listing, status }) => {
  const imageUrl =
    listing?.primary_image?.url ||
    listing?.images?.[0]?.image_url ||
    listing?.images?.[0]?.url ||
    listing?.primary_image ||
    listing?.images?.[0] ||
    listing?.thumbnail_url;

  const sellerLabel =
    listing?.user_netid ||
    listing?.user_email?.split("@")[0] ||
    "Seller";

  const formattedPrice =
    listing?.price != null
      ? `$${Number(listing.price).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "--";

  return (
    <div className="card card-padding details-card-inner">
      <div className="pending-badge">
        {status ? status.toUpperCase() : "PENDING"}
      </div>

      <div className="item-image-container">
        {imageUrl ? (
          <img src={imageUrl} alt={listing?.title || "Listing"} className="item-image" />
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
              <span>Seller:</span> {sellerLabel}
            </p>
            <p>
              <span>Buyer:</span> You
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

  // ---- Load transaction + listing ----
  useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      // 1) Transaction details (use shared API helper)
      const tx = await getTransaction(transactionId);
      if (cancelled) return;

      setTransaction(tx);

      const normalizedStatus = (tx.status || "").toUpperCase();
      if (normalizedStatus !== "PENDING") {
        setIsConfirmed(true);
      }

      setPaymentMethod(tx.payment_method || "venmo");
      setDeliveryType(tx.delivery_method || "meetup");
      setLocation(tx.meet_location || "");

      if (tx.meet_time) {
        setMeetingTime(tx.meet_time.slice(0, 16));
      } else {
        setMeetingTime("");
      }

      // 2) Listing details
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
}, [transactionId]);

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


  const handleSave = async () => {
    if (!transaction) return;

    if (isConfirmed) return;

    if (!location || !meetingTime) {
      setError("Please choose a location and meeting time for a meetup.");
      return;
    }

    // Only allowed to pick the time after "now + 1hr"
    if (isMeetingTimeTooSoon()) {
      setError("Meeting time must be at least 1 hour from now.");
      return;
    }
    
    setIsSaving(true);
    setError("");

    // Safely extract id from the transaction object
    const txId =
      transaction.transaction_id || transaction.id || transactionId;

    try {
      // Update payment method
      await client.patch(`/transactions/${txId}/payment-method/`, {
        payment_method: paymentMethod,
      });

      // Update delivery details
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
      setIsConfirmed(true);
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

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    // TODO: Connect chat APIs
    setChatInput("");
  };

  const isSaveDisabled =
    isSaving ||
    !transaction ||
    isConfirmed ||
    !location ||
    !meetingTime ||
    isMeetingTimeTooSoon();

  const status = transaction?.status || "PENDING";

  return (
    <div className="transaction-page-container">
      <Header status={status} />

      <main className="main-content">
        <div className="content-grid">
          {/* Left Column (Main Content) */}
          <div className="left-column">
            <TransactionDetailsCard listing={listing} status={status} />

            {/* Proposal Card */}
            <div className="card">
              <div className="card-header">
                <h3>Transaction Proposal</h3>
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

                {/* Payment Method Section */}
                <div className="section-group">
                  <label className="section-label">Payment Method</label>
                  <div className="options-stack">
                    <PaymentOption
                      id="venmo"
                      label="Venmo"
                      subLabel="Send via Venmo"
                      icon={
                        <Heart
                          size={18}
                          color={
                            paymentMethod === "venmo" ? "#60a5fa" : "#3b82f6"
                          }
                          fill={
                            paymentMethod === "venmo" ? "#60a5fa" : "#3b82f6"
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
                  <label className="section-label">Delivery Details</label>
                  <div className="delivery-toggle-container">
                    <button
                      onClick={() => setDeliveryType("meetup")}
                      className={`toggle-option ${
                        deliveryType === "meetup" ? "active" : "inactive"
                      }`}
                    >
                      <ArrowRightLeft size={14} />
                      Meetup
                    </button>
                    <button
                      onClick={() => setDeliveryType("pickup")}
                      className={`toggle-option ${
                        deliveryType === "pickup" ? "active" : "inactive"
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
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                          transform: isDropdownOpen ? "rotate(180deg)" : "none",
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

                  <div className="helper-text">
                    <Info size={12} />
                    <span>
                      {deliveryType === "meetup"
                        ? "Select a safe public location on campus."
                        : "The buyer will come to this location to pick up the item."}
                    </span>
                  </div>
                </div>

                {/* Meeting Time */}
                <div className="section-group">
                  <label className="section-label">Meeting Time</label>
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
                    <span>Meeting time must be at least 1 hour from now.</span>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isSaveDisabled}
                  className="save-btn"
                >
                  {isConfirmed ? (
                    "Details confirmed"
                  ) : isSaving ? (
                    <>
                      <div className="spinner" />
                      Saving...
                    </>
                  ) : (
                    "Confirm Details"
                  )}
                </button>
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

            {/* Chat Card (still mock for now) */}
            <div className="card chat-container">
              <div className="card-header">
                <h3>Chat</h3>
              </div>

              <div className="chat-messages-area">
                <div className="chat-bubble">
                  <div className="chat-bubble-content">
                    <div className="chat-icon-box">
                      <Info size={14} color="#2563eb" />
                    </div>
                    <div>
                      <p className="chat-text">
                        Transaction initiated. Buyer can now set payment and
                        delivery preferences.
                      </p>
                      <span className="chat-time">09:49 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="chat-input-area">
                <div className="chat-input-wrapper">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="chat-send-btn"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
