// src/pages/MyListings.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";   
import ListingCard from "../components/ListingCard";

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
    console.log(`Edit listing ${id} clicked`);
    // Backend team will implement functionality later
  };

  const deleteListing = (id) => {
    setListings(listings.filter(l => l.id !== id));
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
          onMarkSold={(e) => { e.stopPropagation(); markAsSold(listing.id); }}
          onEdit={(e) => { e.stopPropagation(); editListing(listing.id); }}
          onDelete={(e) => { e.stopPropagation(); deleteListing(listing.id); }}
          onViewDetails={() => viewDetails(listing.id)} 
        />
      ))}
    </div>
  );
}
