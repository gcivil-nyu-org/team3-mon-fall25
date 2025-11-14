import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { FaTimes, FaCamera } from "react-icons/fa";
import "./EditProfile.css";

export default function EditProfile({ onClose }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "Alex Morgan",
    username: "current_user",
    email: user?.email || "alex.morgan@nyu.edu",
    phone: "(555) 123-4567",
    dorm: "Founders Hall",
    bio: "NYU student selling items I no longer need. Always happy to negotiate prices!",
  });

  const [charCount, setCharCount] = useState(formData.bio.length);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would normally make an API call to update the profile
    console.log("Updating profile with:", formData);
    // Close the modal after saving
    onClose();
  };

  const handleOverlayClick = (e) => {
    // Close modal when clicking on the overlay (not the modal content)
    if (e.target.className === "modal-overlay") {
      onClose();
    }
  };

  const handleChangePhoto = () => {
    // In a real implementation, this would open a file picker
    console.log("Change photo clicked");
    alert("Photo upload functionality would be implemented here");
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
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Profile Photo Section */}
          <div className="photo-section">
            <div className="profile-photo-large">
              {getInitials()}
            </div>
            <button
              type="button"
              className="change-photo-button"
              onClick={handleChangePhoto}
            >
              <FaCamera />
              <span>Change Photo</span>
            </button>
            <p className="photo-helper-text">
              Recommended: Square image, at least 400x400px
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
            <label htmlFor="dorm" className="form-label">
              Dorm/Residence <span className="required">*</span>
            </label>
            <select
              id="dorm"
              name="dorm"
              value={formData.dorm}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">Select a dorm</option>
              <option value="Founders Hall">Founders Hall</option>
              <option value="Hayden Hall">Hayden Hall</option>
              <option value="Weinstein Hall">Weinstein Hall</option>
              <option value="Brittany Hall">Brittany Hall</option>
              <option value="Rubin Hall">Rubin Hall</option>
              <option value="Third North">Third North</option>
              <option value="U-Hall">U-Hall</option>
              <option value="Palladium">Palladium</option>
              <option value="Other">Other</option>
            </select>
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
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="save-button">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
