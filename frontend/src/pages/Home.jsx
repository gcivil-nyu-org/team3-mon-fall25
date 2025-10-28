import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        textAlign: "center",
        maxWidth: "700px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <h1
        style={{
          fontSize: "3.5rem",
          fontWeight: "800",
          marginBottom: "1rem",
        }}
      >
        Welcome to NYU Marketplace
      </h1>

      <p
        style={{
          fontSize: "1.3rem",
          marginBottom: "3rem",
          lineHeight: "1.6",
          opacity: 0.9,
        }}
      >
        Your one-stop platform for discovering, posting, and managing listings
        within the NYU community.
      </p>

      <Link
        to="/create-listing"
        style={{
          backgroundColor: "#fff",
          color: "#56018D",
          padding: "14px 40px",
          fontSize: "1.2rem",
          fontWeight: "600",
          textDecoration: "none",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          transition: "all 0.3s ease",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#e9ddf5")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#fff")}
      >
        + Create a Listing
      </Link>
    </div>
  );
}
