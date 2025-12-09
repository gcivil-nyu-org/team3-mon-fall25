import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getMyListings, getListingsByUserId } from "../api/listings.js";
import { getProfileById, searchProfiles, deleteProfile } from "../api/profiles.js";
import { FaArrowLeft, FaEdit, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar, FaBoxOpen, FaExclamationTriangle, FaTrash } from "react-icons/fa";
import EditProfile from "./EditProfile";
import DeleteAccountModal from "../components/DeleteAccountModal";
import "./Profile.css";
import SEO from "../components/SEO";

const sortToOrdering = (sort) => {
  switch (sort) {
    case "price-low": return "price";
    case "price-high": return "-price";
    case "oldest": return "created_at";
    case "newest": return "-created_at";
    default: return "-created_at";
  }
};

export default function Profile() {
  const navigate = useNavigate();
  const { username } = useParams(); // Optional username from URL (e.g., /profile/:username)
  const { user, logout } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [profile, setProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Load profile by username (always required in URL now)
  const loadProfile = async () => {
    if (isDeleting) return; // Don't load if account is being deleted
    setProfileError(null);

    try {
      let targetUsername = username;

      // If no username in URL, fetch current user's profile and redirect to their username
      if (!targetUsername) {
        // Try to find profile by user context
        if (user) {
            let searchParams = {};
            if (user.username) {
                searchParams.username = user.username;
            } else if (user.user_id || user.id) {
                searchParams.user = user.user_id || user.id;
            }

            if (Object.keys(searchParams).length > 0) {
                 const searchRes = await searchProfiles(searchParams);
                 if (searchRes.data && searchRes.data.length > 0) {
                     targetUsername = searchRes.data[0].username;
                     navigate(`/profile/${targetUsername}`, { replace: true });
                     return;
                 }
            }
        }
        
        setProfileError("Profile not found.");
        return;
      }

      // Step 1: Resolve username to Profile ID
      // We use the search endpoint to find the profile by username
      const searchResponse = await searchProfiles({ username: targetUsername });
      
      if (!searchResponse.data || searchResponse.data.length === 0) {
          throw new Error("Profile not found");
      }

      // Assuming username is unique, take the first result
      const profileId = searchResponse.data[0].profile_id;

      // Step 2: Fetch full profile details by ID
      const response = await getProfileById(profileId);
      setProfile(response.data);

      // Check if this is the current user's profile
      // The backend 'retrieve' endpoint adds 'is_own_profile'
      const ownProfile = response.data.is_own_profile || false;
      setIsOwnProfile(ownProfile);

    } catch (err) {
      console.error("Failed to load profile:", err);
      if (err.response?.status === 404 || err.message === "Profile not found") {
        setProfileError("Profile not found.");
      } else {
        setProfileError(err.response?.data?.detail || "Failed to load profile.");
      }
    }
  };

  // Load listings by username
  const loadListings = async () => {
    if (isDeleting) return; // Don't load if account is being deleted
    setLoading(true);
    setError(null);
    try {
      if (!profile) {
        setListings([]);
        setLoading(false);
        return;
      }

      const apiParams = {
        ordering: sortToOrdering(sortBy),
      };

      if (selectedCategory !== "all") {
        apiParams.category = selectedCategory;
      }

      // For own profile, use getMyListings (shows all statuses); 
      // for others, use getListingsByUserId (shows active only)
      if (isOwnProfile) {
        const data = await getMyListings(apiParams);
        setListings(data);
      } else {
        if (profile.user_id) {
            const data = await getListingsByUserId(profile.user_id, apiParams);
            setListings(data);
        } else {
            setListings([]);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Failed to load listings.";
      setError(msg);
      console.error("Failed to load listings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    // Load listings after profile is loaded and isOwnProfile is determined
    // Also reload when filters change
    if (profile) {
      loadListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isOwnProfile, selectedCategory, sortBy]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = (shouldRefresh = false, updatedProfile = null) => {
    setIsEditModalOpen(false);
    if (shouldRefresh) {
      if (updatedProfile && updatedProfile.username && updatedProfile.username !== username) {
        // If username changed, navigate to new URL
        navigate(`/profile/${updatedProfile.username}`, { replace: true });
      } else {
        // Otherwise just reload
        loadProfile();
      }
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    // Set deleting flag immediately to prevent any API calls
    setIsDeleting(true);

    try {
      // Delete using profile_id (more reliable than username)
      const profileIdToDelete = profile?.profile_id;
      if (!profileIdToDelete) {
        throw new Error("Profile ID not found");
      }

      // Call the API to delete the profile and user account
      await deleteProfile(profileIdToDelete);

      // Logout the user and clear local storage
      // This prevents any interceptors from redirecting to /login
      logout();

      // Close the modal
      setIsDeleteModalOpen(false);

      // Force a full page reload to home to prevent any pending requests
      // Using window.location instead of navigate to completely unmount the app
      window.location.href = '/';
    } catch (err) {
      console.error("Failed to delete account:", err);
      console.error("Error response:", err.response);

      const errorMessage = err.response?.data?.detail ||
                          err.response?.data?.message ||
                          err.message ||
                          "Failed to delete account. Please try again.";

      alert(`Error: ${errorMessage}`);
      setIsDeleteModalOpen(false);
      setIsDeleting(false); // Reset flag on error
    }
  };

  const handleListingClick = (listingId) => {
    navigate(`/listing/${listingId}`);
  };

  // Get initials for avatar
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      const email = user.email.split("@")[0];
      return email.charAt(0).toUpperCase();
    }
    return "A";
  };

  // Format member since date
  const formatMemberSince = (dateString) => {
    if (!dateString) return "Member";
    const date = new Date(dateString);
    return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  // Use profile data for statistics
  const activeListings = profile?.active_listings ?? 0;
  const soldItems = profile?.sold_items ?? 0;

  // Show error state if profile not found
  if (profileError) {
    return (
      <>
        <SEO
          title="Profile Not Found - NYU Marketplace"
          description="The requested profile could not be found."
        />
        <div className="profile-page">
          <button className="back-button" onClick={handleBack}>
            <FaArrowLeft />
            <span>Back</span>
          </button>
          <div className="empty-state">
            <div className="empty-icon">
              <FaBoxOpen />
            </div>
            <h3>Profile Not Found</h3>
            <p>{profileError}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={isOwnProfile ? "My Profile - NYU Marketplace" : `${profile?.full_name || "User"}'s Profile - NYU Marketplace`}
        description={isOwnProfile ? "View and update your profile and contact info." : `View ${profile?.full_name || "user"}'s profile and listings.`}
        canonical={isOwnProfile ? "http://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com/profile" : undefined}
      />

      <div className="profile-page">
        {/* Back Button */}
        <button className="back-button" onClick={handleBack}>
          <FaArrowLeft />
          <span>Back</span>
        </button>

        {/* Profile Card */}
        <div className="profile-card">
          {/* Only show Edit Profile button if viewing own profile */}
          {isOwnProfile && (
            <button className="edit-profile-button" onClick={handleEditProfile}>
              <FaEdit />
              <span>Edit Profile</span>
            </button>
          )}

          <div className="profile-header">
            {/* Profile Picture - Left Side */}
            <div className="profile-left">
              <div className="profile-avatar-large">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                ) : (
                  getInitials()
                )}
              </div>
            </div>

            {/* Header Info - Right Side Top */}
            <div className="profile-right">
              <h1 className="profile-name">{profile?.full_name || user?.email?.split("@")[0] || "User"}</h1>
              <p className="profile-username">@{profile?.username || "user"}</p>
              {profile?.bio && (
                <p className="profile-bio">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Contact Information - Right Side Middle */}
            <div className="contact-info">
              <div className="contact-item">
                <FaEnvelope className="contact-icon" />
                <span>{profile?.email || user?.email || "No email"}</span>
              </div>
              {profile?.phone && (
                <div className="contact-item">
                  <FaPhone className="contact-icon" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.location && (
                <div className="contact-item">
                  <FaMapMarkerAlt className="contact-icon" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="contact-item">
                <FaCalendar className="contact-icon" />
                <span>{formatMemberSince(profile?.member_since)}</span>
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

        {/* Danger Zone - Only show for own profile */}
        {isOwnProfile && (
          <div className="danger-zone">
            <div className="danger-zone-content">
              <div className="danger-zone-left">
                <FaExclamationTriangle className="danger-icon" />
              </div>
              <div className="danger-zone-right">
                <h3 className="danger-zone-heading">Danger Zone</h3>
                <p className="danger-zone-text">
                  Once you delete your account, there is no going back. All your listings, messages, and profile information will be permanently deleted.
                </p>
                <button className="delete-account-button" onClick={handleDeleteAccount}>
                  <FaTrash />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <EditProfile
            onClose={handleCloseEditModal}
            profile={profile}
          />
        )}

        {/* Delete Account Modal */}
        {isDeleteModalOpen && (
          <DeleteAccountModal
            onClose={handleCloseDeleteModal}
            onConfirm={handleConfirmDelete}
          />
        )}
      </div>
    </>
  );
}
