import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getMyListings } from "../api/listings.js";
import { FaArrowLeft, FaEdit, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar, FaBoxOpen } from "react-icons/fa";
import EditProfile from "./EditProfile";
import "./Profile.css";
import SEO from "../components/SEO";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Load user's listings
  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyListings();
        setListings(data);
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || "Failed to load listings.";
        setError(msg);
        console.error("Failed to load listings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleListingClick = (listingId) => {
    navigate(`/listing/${listingId}`);
  };

  // Get initials for avatar
  const getInitials = () => {
    if (user?.email) {
      const email = user.email.split("@")[0];
      return email.charAt(0).toUpperCase();
    }
    return "A";
  };

  // Use dummy values for statistics
  const activeListings = 6;
  const soldItems = 18;

  return (
    <>
      <SEO
        title="Profile - NYU Marketplace"
        description="View and update your profile and contact info."
        canonical="http://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com/profile"
      />

      <div className="profile-page">
        {/* Back Button */}
        <button className="back-button" onClick={handleBack}>
          <FaArrowLeft />
          <span>Back</span>
        </button>

        {/* Profile Card */}
        <div className="profile-card">
          <button className="edit-profile-button" onClick={handleEditProfile}>
            <FaEdit />
            <span>Edit Profile</span>
          </button>

          <div className="profile-header">
            {/* Profile Picture - Left Side */}
            <div className="profile-left">
              <div className="profile-avatar-large">
                {getInitials()}
              </div>
            </div>

            {/* Header Info - Right Side Top */}
            <div className="profile-right">
              <h1 className="profile-name">Alex Morgan</h1>
              <p className="profile-username">@current_user</p>
              <p className="profile-bio">
                NYU student selling items I no longer need. Always happy to negotiate prices!
              </p>
            </div>

            {/* Contact Information - Right Side Middle */}
            <div className="contact-info">
              <div className="contact-item">
                <FaEnvelope className="contact-icon" />
                <span>{user?.email || "alex.morgan@nyu.edu"}</span>
              </div>
              <div className="contact-item">
                <FaPhone className="contact-icon" />
                <span>(555) 123-4567</span>
              </div>
              <div className="contact-item">
                <FaMapMarkerAlt className="contact-icon" />
                <span>Founders Hall</span>
              </div>
              <div className="contact-item">
                <FaCalendar className="contact-icon" />
                <span>Member since August 2024</span>
              </div>
            </div>

            {/* Statistics - Right Side Bottom */}
            <div className="statistics">
              <div className="stat-item">
                <div className="stat-number">{activeListings}</div>
                <div className="stat-label">Active Listings</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{soldItems}</div>
                <div className="stat-label">Items Sold</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter/Sort Section */}
        <div className="filter-sort-section">
          <select
            className="filter-dropdown"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="furniture">Furniture</option>
            <option value="books">Books</option>
            <option value="clothing">Clothing</option>
          </select>

          <select
            className="filter-dropdown"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>

          <span className="listings-count">{listings.length} listings</span>
        </div>

        {/* Listings Grid */}
        <div className="listings-section">
          {loading ? (
            <div className="empty-state">
              <p>Loading listings...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaBoxOpen />
              </div>
              <h3>Error loading listings</h3>
              <p>{error}</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaBoxOpen />
              </div>
              <h3>No listings found</h3>
              <p>There are no listings available at the moment. Check back later!</p>
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map((listing) => (
                <div
                  key={listing.listing_id}
                  className="listing-card-buyer"
                  onClick={() => handleListingClick(listing.listing_id)}
                >
                  <div className="listing-image">
                    {listing.primary_image ? (
                      <img src={listing.primary_image} alt={listing.title} />
                    ) : (
                      <div className="listing-placeholder">
                        <FaBoxOpen size={40} color="#56018D" />
                      </div>
                    )}
                  </div>
                  <div className="listing-content">
                    <h3 className="listing-title">{listing.title}</h3>
                    <p className="listing-price">${listing.price}</p>
                    <div className="listing-meta">
                      <span className="listing-category">{listing.category}</span>
                      <span className={`listing-status ${listing.status}`}>
                        {listing.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <EditProfile onClose={handleCloseEditModal} />
        )}
      </div>
    </>
  );
}
