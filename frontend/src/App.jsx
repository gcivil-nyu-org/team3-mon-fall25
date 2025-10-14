import React from "react";
import { Outlet, Link } from "react-router-dom";
import "./App.css";

export default function App() {
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

      </nav>

      {/* Render page content here */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Outlet />
      </div>
    </div>
  );
}
