import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, User, Calendar, DollarSign, ArrowRight } from "lucide-react";
import { getMyOrders } from "../api/transactions";
import { useAuth } from "../contexts/AuthContext";
import "./MyOrdersPage.css";

const STATUS_LABELS = {
  PENDING: "Initiated",
  INITIATED: "Initiated",
  NEGOTIATING: "Negotiating",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function StatusBadge({ status }) {
  if (!status) return null;
  const key = status.toUpperCase();
  const label = STATUS_LABELS[key] || status;
  const className = `myorders__status myorders__status--${key.toLowerCase()}`;
  return <span className={className}>{label}</span>;
}

function EmptyState({ mode }) {
  return (
    <div className="myorders__empty-card">
      <Package className="myorders__empty-icon" />
      <p className="myorders__empty-text">
        {mode === "buying" ? "No buying orders yet" : "No selling orders yet"}
      </p>
      <Link to="/browse" className="myorders__empty-link">
        Browse listings
      </Link>
    </div>
  );
}

function OrderCard({ order }) {
  const txId = order.transaction_id;
  const title = order.listing_title ?? `Listing #${order.listing}`;
  const price = order.listing_price ?? "—";

  // 盡量猜一個圖片欄位，如果都沒有就顯示占位
  const imageUrl =
    order.listing_thumbnail_url ||
    order.listing_image_url ||
    order.listing_image ||
    null;

  const createdAt = order.created_at
    ? new Date(order.created_at).toLocaleDateString()
    : "";

  const meetTime = order.meet_time
    ? new Date(order.meet_time).toLocaleString()
    : "";

  // 若有 viewer_role，可顯示 "You are the buyer/seller"
  const roleLabel =
    order.viewer_role === "buyer"
      ? "You are the buyer"
      : order.viewer_role === "seller"
      ? "You are the seller"
      : null;

  // 若有 buyer_netid 且是 seller，可以顯示 buyer 資訊
  const counterpartText =
    order.viewer_role === "seller" && order.buyer_netid
      ? `Buyer: ${order.buyer_netid}`
      : roleLabel;

  return (
    <Link to={`/transaction/${txId}`} className="myorders__card">
      <div className="myorders__card-inner">
        {/* 左側圖片 */}
        <div className="myorders__image-wrapper">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="myorders__image"
            />
          ) : (
            <div className="myorders__image-placeholder">
              <Package className="myorders__image-placeholder-icon" />
            </div>
          )}
        </div>

        {/* 右側內容 */}
        <div className="myorders__content">
          <div className="myorders__content-header">
            <div className="myorders__title-block">
              <h3 className="myorders__title">{title}</h3>
              {counterpartText && (
                <div className="myorders__counterpart">
                  <User className="myorders__counterpart-icon" />
                  <span>{counterpartText}</span>
                </div>
              )}
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="myorders__meta-row">
            <div className="myorders__meta-item">
              <DollarSign className="myorders__meta-icon" />
              <span>
                {price !== "—" ? `$${price}` : "Price not set"}
              </span>
            </div>
            {createdAt && (
              <div className="myorders__meta-item">
                <Calendar className="myorders__meta-icon" />
                <span>{createdAt}</span>
              </div>
            )}
            {order.payment_method && (
              <div className="myorders__meta-item myorders__meta-item--muted">
                <span>Payment:</span>
                <span className="myorders__meta-pill">
                  {String(order.payment_method).toUpperCase()}
                </span>
              </div>
            )}
            {order.delivery_method && (
              <div className="myorders__meta-item myorders__meta-item--muted">
                <span>Delivery:</span>
                <span className="myorders__meta-pill">
                  {String(order.delivery_method).toLowerCase()}
                </span>
              </div>
            )}
          </div>

          {(order.meet_location || meetTime) && (
            <div className="myorders__location">
              <span className="myorders__location-label">Location:</span>
              <span className="myorders__location-text">
                {order.meet_location || "TBD"}
                {meetTime && (
                  <span className="myorders__location-dot">
                    • {meetTime}
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="myorders__cta-row">
            <span className="myorders__details-link">
              View details
              <ArrowRight className="myorders__details-icon" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState("buying"); // "buying" | "selling"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await getMyOrders();
        if (!mounted) return;
        const normalized = Array.isArray(data) ? data : data.results ?? [];
        setOrders(normalized);
        setError("");
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError("Failed to load orders.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 用 viewer_role 分 Buying / Selling，比用 id 比較可靠
  const buyingOrders = useMemo(
    () => orders.filter((o) => o.viewer_role === "buyer"),
    [orders]
  );

  const sellingOrders = useMemo(
    () => orders.filter((o) => o.viewer_role === "seller"),
    [orders]
  );

  const activeList = mode === "buying" ? buyingOrders : sellingOrders;

  return (
    <div className="container myorders">
      {/* Header */}
      <header className="myorders__header">
        <div className="myorders__header-left">
          <div className="myorders__header-icon">
            <Package className="myorders__header-icon-svg" />
          </div>
          <div>
            <h1 className="myorders__heading">My Orders</h1>
            <p className="myorders__subheading">
              Track all your transactions
            </p>
          </div>
        </div>
        <Link to="/browse" className="myorders__back-btn">
          Back to Browse
        </Link>
      </header>

      {/* Tabs */}
      <div className="myorders__tabs">
        <button
          type="button"
          className={`myorders__tab ${
            mode === "buying" ? "myorders__tab--active" : ""
          }`}
          onClick={() => setMode("buying")}
        >
          Buying ({buyingOrders.length})
        </button>
        <button
          type="button"
          className={`myorders__tab ${
            mode === "selling" ? "myorders__tab--active" : ""
          }`}
          onClick={() => setMode("selling")}
        >
          Selling ({sellingOrders.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="myorders__state">Loading orders...</div>
      ) : error ? (
        <div className="myorders__state myorders__state--error">
          {error}
        </div>
      ) : activeList.length === 0 ? (
        <EmptyState mode={mode} />
      ) : (
        <div className="myorders__list">
          {activeList.map((order) => (
            <OrderCard key={order.transaction_id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}