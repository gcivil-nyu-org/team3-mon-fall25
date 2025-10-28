import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import "./App.css";

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#56018D",
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Global Navbar */}
      <nav
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "40px",
          padding: "20px 0",
          fontSize: "1.2rem",
          fontWeight: "500",
          backgroundColor: "#56018D",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>
          Home
        </Link>
        <Link to="/create-listing" style={{ color: "#fff", textDecoration: "none" }}>
          Create Listing
        </Link>
        <Link to="/my-listings" style={{ color: "#fff", textDecoration: "none" }}>
          My Listings
        </Link>
        <span style={{ color: "#fff", opacity: 0.8, fontSize: "1rem" }}>
          {user?.email || user?.netid}
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "2px solid #fff",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "#fff";
            e.target.style.color = "#56018D";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "transparent";
            e.target.style.color = "#fff";
          }}
        >
          Logout
        </button>
      </nav>

      {/* Render page content here */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Outlet />
      </div>
    </div>
  );
}
