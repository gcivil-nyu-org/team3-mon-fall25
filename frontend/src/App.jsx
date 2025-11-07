import React from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import "./App.css";
import headerIcon from "./assets/images/header-icon.png";

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
      <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
        <div className="nav__brandLogo" style={{ marginRight: "12px" }}>
          <img 
            src={headerIcon} 
            alt="Campus Market Logo"
            style={{ height: "36px", width: "auto", display: "block", objectFit: "contain" }}
          />
        </div>
        <span className="nav__brandText">Your Campus, Your Market!</span>
      </Link>
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
