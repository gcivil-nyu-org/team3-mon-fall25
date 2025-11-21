import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateMyProfile, createProfile } from "../api/profiles.js";
import { FaTimes, FaCamera, FaTrash, FaPlus } from "react-icons/fa";
import "./EditProfile.css";

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function EditProfile({ onClose, profile }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || "",
    username: profile?.username || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    bio: profile?.bio || "",
  });

  const [charCount, setCharCount] = useState(formData.bio.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "bio") {
      if (value.length <= 500) {
        setFormData({ ...formData, [name]: value });
        setCharCount(value.length);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append("full_name", formData.fullName);
      payload.append("username", formData.username);
      if (formData.phone) payload.append("phone", formData.phone);
      if (formData.location) payload.append("location", formData.location);
      if (formData.bio) payload.append("bio", formData.bio);

      if (avatarFile) {
        payload.append("new_avatar", avatarFile);
      } else if (removeAvatar) {
        payload.append("remove_avatar", "true");
      }

      if (profile) {
        // Update existing profile
        await updateMyProfile(payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Create new profile
        await createProfile(payload);
      }

      // Dispatch event to notify other components (like ProfileDropdown) to refresh
      window.dispatchEvent(new Event('profileUpdated'));

      // Close modal and trigger refresh
      onClose(true);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData && typeof errorData === "object") {
        // Format validation errors
        const messages = Object.entries(errorData)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`)
          .join("\n");
        setError(messages);
      } else {
        setError(err.response?.data?.detail || err.message || "Failed to save profile");
      }
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    // Close modal when clicking on the overlay (not the modal content)
    if (e.target.className === "modal-overlay") {
      onClose(false);
    }
  };

  const handleChangePhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/gif,image/webp";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setError("Image must be less than 10MB");
          return;
        }
        setAvatarFile(file);
        setRemoveAvatar(false);
        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleRemovePhoto = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  // Get initials for avatar
  const getInitials = () => {
    if (formData.fullName) {
      return formData.fullName.charAt(0).toUpperCase();
    }
    return "A";
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Edit Profile</h2>
            <p className="modal-subtitle">
              Update your profile information. Changes will be visible to other users.
            </p>
          </div>
          <button className="close-button" onClick={() => onClose(false)}>
            <FaTimes />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Error Display */}
          {error && (
            <div className="error-message" style={{ color: "red", marginBottom: "1rem", whiteSpace: "pre-line" }}>
              {error}
            </div>
          )}

          {/* Profile Photo Section */}
          <div className="photo-section">
            <div className="profile-photo-large">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                getInitials()
              )}
            </div>

            {/* Photo action buttons */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              {avatarPreview ? (
                <>
                  <button
                    type="button"
                    className="change-photo-button"
                    onClick={handleChangePhoto}
                    style={{ flex: "1", minWidth: "120px" }}
                  >
                    <FaCamera />
                    <span>Change Photo</span>
                  </button>
                  <button
                    type="button"
                    className="change-photo-button"
                    onClick={handleRemovePhoto}
                    style={{ flex: "1", minWidth: "120px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}
                  >
                    <FaTrash />
                    <span>Remove Photo</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="change-photo-button"
                  onClick={handleChangePhoto}
                >
                  <FaPlus />
                  <span>Add Photo</span>
                </button>
              )}
            </div>

            {/* File size info */}
            {avatarFile && (
              <div style={{
                marginTop: "8px",
                padding: "8px 12px",
                background: avatarFile.size > 8 * 1024 * 1024 ? "#fef2f2" : "#f9fafb",
                borderRadius: "6px",
                fontSize: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: avatarFile.size > 8 * 1024 * 1024 ? "#dc2626" : "#6b7280",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }}>
                  {avatarFile.name}
                </span>
                <span style={{ fontWeight: 600 }}>{formatFileSize(avatarFile.size)}</span>
              </div>
            )}

            <p className="photo-helper-text">
              Recommended: Square image, at least 400x400px. Max 10MB.
            </p>
          </div>

          {/* Form Fields */}
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username <span className="required">*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              required
            />
            <p className="helper-text">
              This is your unique identifier on the platform
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
            />
            <p className="helper-text">
              Optional - Visible only to buyers who contact you
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="location" className="form-label">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., Manhattan, NY or Founders Hall"
            />
            <p className="helper-text">
              Your general location or dorm/residence
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="bio" className="form-label">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="form-textarea"
              rows="4"
            />
            <div className="char-counter">
              {charCount}/500
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => onClose(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={saving}>
              {saving ? "Saving..." : (profile ? "Save Changes" : "Create Profile")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
