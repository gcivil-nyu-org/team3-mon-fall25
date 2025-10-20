// src/pages/MyListings.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ListingCard from "../components/ListingCard";
import { deleteListingAPI } from "../api/listings";

export default function MyListings() {
  const navigate = useNavigate(); // hook for redirection

  const [listings, setListings] = useState([
    { id: 1, title: "MacBook Pro", price: 1200, status: "Active" },
    { id: 2, title: "iPhone 13", price: 800, status: "Sold" },
  ]);

  const markAsSold = (id) => {
    setListings(listings.map(l => l.id === id ? { ...l, status: "Sold" } : l));
  };

  // ✅ Removed alert and left a backend placeholder
  const editListing = (id) => {
    navigate(`/listing/${id}/edit`);
  };

  const deleteListing = (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this listing?");
    if (confirmed) {
      setListings(prev => prev.filter(l => l.id !== id));
      console.log(`Listing ${id} deleted`);
    }
  };

  // ✅ Navigate to detail page only when card is clicked
  const viewDetails = (id) => {
    navigate(`/listing/${id}`);
  };

  return (
    <div className="my-listings-page">
      <h1>My Listings</h1>
      {listings.map(listing => (
        <ListingCard
          key={listing.id}
          {...listing}
          onMarkSold={() => markAsSold(listing.id)}
          onEdit={() => editListing(listing.id)}
          onDelete={() => deleteListing(listing.id)}
          onViewDetails={() => viewDetails(listing.id)}
        />
      ))}
    </div>
  );
}
