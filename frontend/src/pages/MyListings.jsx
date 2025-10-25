import React, {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import ListingCard from "../components/ListingCard";
import {getMyListings, putListing, patchListing} from "@/api/listings.js";
import { deleteListingAPI } from "../api/listings";

export default function MyListings() {
  const navigate = useNavigate(); // hook for redirection
  const [listings, setListings] = useState([]);
  // const [listings, setListings] = useState([
  //   { id: 1, title: "MacBook Pro", price: 1200, status: "Active" },
  //   { id: 2, title: "iPhone 13", price: 800, status: "Sold" },
  // ]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyListings();

        const mapped = data.map(l => ( {
          id: l.listing_id,
          title: l.title,
          price: l.price,
          status: l.status?.charAt(0).toUpperCase() + l.status?.slice(1),
        }));
        setListings(mapped);
      }catch (e){
        const msg = e.response?.data?.detail ||
          e.message ||
          "Failed to load your listings."
        console.log(msg);
      }
    })();
  }, []);

  const markAsSold = async (id) => {
    const current = listings.find((l) => l.id === id);
    if (!current) return;

    const payload = {
      category: current.category,
      title: current.title,
      description: current.description,
      price: current.price,
      status: "sold",
      location: current.location,
    };

    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "Sold" } : l))
    );

    try {
      await patchListing(id, payload);
    } catch (err) {
      // Roll back on failure
      setListings((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: current.status } : l
        )
      );
      console.error("Failed to mark as sold:", err);
      alert("Failed to mark as sold. Please try again.");
    }
  };

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
