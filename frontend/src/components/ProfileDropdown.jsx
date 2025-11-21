import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getMyProfile } from "../api/profiles.js";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import "./ProfileDropdown.css";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Load profile data
  const loadProfile = async () => {
    try {
      const response = await getMyProfile();
      setProfile(response.data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  useEffect(() => {
    loadProfile();

    // Listen for profile updates from EditProfile
    const handleProfileUpdate = () => {
      loadProfile();
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use setTimeout to ensure the event listener is added after the current click event
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleMyProfile = () => {
    setIsOpen(false);
    navigate("/profile");
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate("/login");
  };

  // Generate initials for avatar placeholder
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      {/* Profile Avatar Trigger */}
      <button className="profile-avatar" onClick={handleToggle}>
        <div className="avatar-circle">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          ) : (
            getInitials()
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="dropdown-menu">
          {/* User Info Section */}
          <div className="user-info-section">
            <div className="user-avatar-small">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                getInitials()
              )}
            </div>
            <div className="user-details">
              <div className="user-name">{profile?.full_name || user?.email?.split("@")[0] || "User"}</div>
              <div className="user-email">{profile?.email || user?.email || "user@nyu.edu"}</div>
            </div>
          </div>

          {/* Divider */}
          <div className="dropdown-divider"></div>

          {/* Menu Items */}
          <div className="menu-items">
            <button className="menu-item" onClick={handleMyProfile}>
              <FaUser className="menu-icon" />
              <span>My Profile</span>
            </button>

            <button className="menu-item logout" onClick={handleLogout}>
              <FaSignOutAlt className="menu-icon" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
