import React from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import "./App.css";
import logoImage from "./assets/images/nyu-marketplace-header-logo.png";

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
  style={{
    minHeight: "100vh",
    background: "var(--bg)",      // light page background
    color: "#111",                 // normal text; nav sets its own color
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: "flex",
    flexDirection: "column",
  }}
>
      {/* Global Navbar */}
      <nav style={{ backgroundColor: "#56018D" }}>
  <div className="container nav">
    {/* Brand (left) */}
    <div className="nav__brand">
      <img 
        src={logoImage} 
        alt="NYU Marketplace"
        style={{ 
          height: "45px",
          width: "auto",
          maxWidth: "90px",
          marginRight: "12px",
          borderRadius: "10px",
          padding: "4px",
          background: "#ffffff20",  // semi-transparent white for a subtle highlight
          backdropFilter: "blur(5px)"
        }}
      />
      <span className="nav__brandText">Your Campus, Your Market!</span>
    </div>

    {/* Links (right) */}
    <div className="nav__links">
      <NavLink to="/" end className="nav__link">Home</NavLink>
      <NavLink to="/browse" className="nav__link">Browse</NavLink>
      <NavLink to="/create-listing" className="nav__link">Create Listing</NavLink>
      <NavLink to="/my-listings" className="nav__link">My Listings</NavLink>
      <span className="nav__user">{user?.email || user?.netid || ""}</span>
      {user ? (
        <button className="nav__btn" onClick={handleLogout}>Logout</button>
      ) : (
        <Link className="nav__btn nav__btn--invert" to="/login">Login</Link>
      )}
    </div>
  </div>
</nav>


      {/* Page content */}
<div style={{ flex: 1 /* no flex centering here */ }}>
  <Outlet />
</div>

    </div>
  );
}
