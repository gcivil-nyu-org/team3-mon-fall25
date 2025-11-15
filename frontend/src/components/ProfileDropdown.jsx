import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import "./ProfileDropdown.css";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          {getInitials()}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="dropdown-menu">
          {/* User Info Section */}
          <div className="user-info-section">
            <div className="user-avatar-small">
              {getInitials()}
            </div>
            <div className="user-details">
              <div className="user-name">Alex Morgan</div>
              <div className="user-email">{user?.email || user?.netid || "user@nyu.edu"}</div>
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
