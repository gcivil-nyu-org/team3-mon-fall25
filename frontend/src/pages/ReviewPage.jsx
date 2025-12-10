import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaStar, FaArrowLeft } from "react-icons/fa";
import { Package } from "lucide-react";
import "./ReviewPage.css";

const TAGS = [
  "Punctuality",
  "Communication",
  "Pricing",
  "Item Description",
];

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract data from navigation state
  const { order, targetName = "the user" } = location.state || {};

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no order data, redirect back
  if (!order) {
    return (
      <div className="review-page">
        <div className="review-page__container">
          <div className="review-page__error-card">
            <Package className="review-page__error-icon" />
            <p className="review-page__error-text">
              No order information found. Please select an order to review.
            </p>
            <button
              onClick={() => navigate("/orders")}
              className="review-page__back-btn"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      alert("Please select a rating before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real app, you'd send this data to the backend
      const reviewData = {
        transactionId: order.transaction_id,
        rating,
        tags: selectedTags,
        comment,
      };

      console.log("Submitting review:", reviewData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Show success message
      alert("Review submitted successfully!");

      // Navigate back to orders page
      navigate("/orders");
    } catch (error) {
      console.error("Failed to submit review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="review-page">
      <div className="review-page__container">
        {/* Header */}
        <header className="review-page__header">
          <button
            onClick={() => navigate("/orders")}
            className="review-page__back-button"
            aria-label="Back to orders"
          >
            <FaArrowLeft />
            <span>Rate Seller</span>
          </button>
          <div className="review-page__header-content">
            <div className="review-page__header-icon">
              <FaStar className="review-page__header-icon-svg" />
            </div>
            <div>
              <h1 className="review-page__heading">Leave a Review</h1>
              <p className="review-page__subheading">
                Share your experience with this transaction
              </p>
            </div>
          </div>
        </header>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="review-page__form">
          <div className="review-page__card">
            {/* User Avatar Placeholder */}
            <div className="review-page__user-section">
              <div className="review-page__user-avatar">
                {targetName.charAt(0).toUpperCase()}
              </div>
              <div className="review-page__user-info">
                <h3 className="review-page__question">
                  How was your experience buying from {targetName}?
                </h3>
                <p className="review-page__subtext">
                  Rating and reviews of sellers are visible to everyone on Marketplace.
                </p>
              </div>
            </div>

            {/* Star Rating */}
            <div className="review-page__section">
              <div className="review-page__stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`review-page__star-btn ${
                      (hoverRating || rating) >= star ? "active" : ""
                    }`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} stars`}
                  >
                    <FaStar />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="review-page__rating-text">
                  {rating} out of 5 stars
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="review-page__section">
              <h4 className="review-page__section-title">What went well?</h4>
              <div className="review-page__tags">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`review-page__tag ${
                      selectedTags.includes(tag) ? "selected" : ""
                    }`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="review-page__section">
              <label
                htmlFor="review-comment"
                className="review-page__section-title"
              >
                Additional Comments (Optional)
              </label>
              <textarea
                id="review-comment"
                className="review-page__textarea"
                placeholder="Share more details about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={6}
              />
            </div>

            {/* Order Details */}
            <div className="review-page__order-info">
              <h4 className="review-page__section-title">Order Details</h4>
              <div className="review-page__order-details">
                <div className="review-page__order-item">
                  <span className="review-page__order-label">Item:</span>
                  <span className="review-page__order-value">
                    {order.listing_title || `Listing #${order.listing}`}
                  </span>
                </div>
                {order.listing_price && (
                  <div className="review-page__order-item">
                    <span className="review-page__order-label">Price:</span>
                    <span className="review-page__order-value">
                      ${order.listing_price}
                    </span>
                  </div>
                )}
                <div className="review-page__order-item">
                  <span className="review-page__order-label">Transaction ID:</span>
                  <span className="review-page__order-value">
                    #{order.transaction_id}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="review-page__footer">
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="review-page__cancel-btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="review-page__submit-btn"
                disabled={rating === 0 || isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
