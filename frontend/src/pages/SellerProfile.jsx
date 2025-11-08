import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaCalendar,
  FaCommentDots,
  FaBox,
} from "react-icons/fa";
import { getListings, getListing } from "@/api/listings";
import ListingGrid from "../components/browse/ListingGrid";
import Empty from "../components/common/Empty";
import Spinner from "../components/common/Spinner";
import "./SellerProfile.css";

export default function SellerProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Get location state if passed

  // Get current listing from navigation state if available
  const currentListing = location.state?.currentListing;
  
  // Initialize with current listing if it matches the seller (for immediate display)
  const getInitialListings = () => {
    if (!currentListing) return [];
    const currentNetid = currentListing.user_netid;
    const currentEmail = currentListing.user_email?.split("@")[0];
    const matchesSeller = 
      (currentNetid && currentNetid.toLowerCase() === username.toLowerCase()) ||
      (currentEmail && currentEmail.toLowerCase() === username.toLowerCase());
    return matchesSeller ? [currentListing] : [];
  };
  
  const [sellerListings, setSellerListings] = useState(getInitialListings);
  const [loading, setLoading] = useState(true);
  // We only use the setter to report errors; the state value itself isn't read.
  // Skip binding the value to avoid an unused variable eslint error.
  const [, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Get all listings - the list endpoint only returns active listings
        // So we need to fetch each listing detail to get user info and include sold/inactive ones
        // In production, this would be a dedicated API endpoint like /api/v1/listings/?user_netid=username
        const allListings = [];
        let page = 1;
        let hasMore = true;
        
        // Fetch all pages of listings (only active ones from API)
        while (hasMore) {
          try {
            const response = await getListings({ page, page_size: 100 });
            console.log(`[SellerProfile] Fetched page ${page}:`, {
              responseType: Array.isArray(response) ? 'array' : typeof response,
              response: response,
              resultsCount: Array.isArray(response) ? response.length : (response?.results?.length || 0),
              hasNext: Array.isArray(response) ? false : !!response?.next,
              totalCount: Array.isArray(response) ? response.length : response?.count,
              listingIds: Array.isArray(response) 
                ? response.map(r => r.listing_id) 
                : (response?.results?.map(r => r.listing_id) || [])
            });
            
            // Handle both array and object responses (like BrowseListings does)
            let pageResults = [];
            let hasNextPage = false;
            
            if (Array.isArray(response)) {
              pageResults = response;
              hasNextPage = false; // Arrays don't have pagination
            } else if (response && typeof response === "object" && "results" in response) {
              pageResults = response.results || [];
              hasNextPage = !!response.next;
            }
            
            if (pageResults.length > 0) {
              allListings.push(...pageResults);
              hasMore = hasNextPage;
              page++;
            } else {
              hasMore = false;
            }
          } catch (err) {
            console.error(`[SellerProfile] Failed to fetch page ${page}:`, err);
            console.error("[SellerProfile] Error details:", err.response?.data || err.message);
            hasMore = false;
          }
        }
        
        console.log(`[SellerProfile] Total listings fetched from all pages: ${allListings.length}`);
        console.log(`[SellerProfile] All listing IDs:`, allListings.map(l => l.listing_id));
        
        // Since the list endpoint doesn't include user_netid/user_email,
        // we need to fetch details for each listing to check the seller
        // Fetch in parallel for better performance
        const listingPromises = allListings.map((listing) =>
          getListing(listing.listing_id).catch((err) => {
            console.error(`[SellerProfile] Failed to fetch listing ${listing.listing_id}:`, err);
            return null;
          })
        );
        
        const listingDetails = await Promise.all(listingPromises);
        
        // Debug: Log the username we're looking for and what we found
        console.log("=== SELLER PROFILE DEBUG ===");
        console.log("Looking for seller with username:", username);
        console.log("Total listings fetched from API:", listingDetails.filter(Boolean).length);
        if (currentListing) {
          console.log("Current listing:", {
            id: currentListing.listing_id,
            user_netid: currentListing.user_netid,
            user_email: currentListing.user_email
          });
        }
        
        // Filter listings by seller username/netid (case-insensitive comparison)
        const filtered = listingDetails
          .filter(Boolean) // Remove failed fetches
          .filter((detail) => {
            if (!detail.user_netid && !detail.user_email) {
              console.log(`[SellerProfile] Listing ${detail.listing_id} has no user info`);
              return false;
            }
            
            const detailNetid = detail.user_netid?.toLowerCase();
            const detailEmail = detail.user_email?.split("@")[0]?.toLowerCase();
            const usernameLower = username.toLowerCase();
            
            const netidMatch = detailNetid === usernameLower;
            const emailMatch = detailEmail === usernameLower;
            
            if (netidMatch || emailMatch) {
              console.log(`[SellerProfile] Listing ${detail.listing_id} matches seller:`, {
                detailNetid,
                detailEmail,
                usernameLower,
                netidMatch,
                emailMatch
              });
            }
            
            return netidMatch || emailMatch;
          });
        
        console.log("Filtered listings from API:", filtered.length);
        console.log("Filtered listing IDs:", filtered.map(l => l.listing_id));
        
        // Start with filtered listings from API
        const allSellerListings = [...filtered];
        
        // Always include current listing if it matches the seller (regardless of status)
        // This ensures we show sold/inactive listings that the API doesn't return
        if (currentListing) {
          const currentListingId = currentListing.listing_id;
          const alreadyIncluded = allSellerListings.some(l => l.listing_id === currentListingId);
          
          if (!alreadyIncluded) {
            const currentNetid = currentListing.user_netid;
            const currentEmail = currentListing.user_email?.split("@")[0];
            const matchesSeller = 
              (currentNetid && currentNetid.toLowerCase() === username.toLowerCase()) ||
              (currentEmail && currentEmail.toLowerCase() === username.toLowerCase());
            
            if (matchesSeller) {
              console.log("Adding current listing to results (may be sold/inactive):", currentListingId);
              allSellerListings.push(currentListing);
            } else {
              console.log("Current listing doesn't match seller");
            }
          } else {
            console.log("Current listing already in API results");
          }
        }
        
        // Remove duplicates by listing_id (in case current listing was already in API results)
        const uniqueListings = Array.from(
          new Map(allSellerListings.map(l => [l.listing_id, l])).values()
        );
        
        console.log("Final unique listings count:", uniqueListings.length);
        console.log("Final listing IDs:", uniqueListings.map(l => l.listing_id));
        console.log("Final listing statuses:", uniqueListings.map(l => ({ id: l.listing_id, status: l.status })));
        console.log("=== END DEBUG ===");
        
        if (mounted) {
          setSellerListings(uniqueListings);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setError("Failed to load seller listings.");
          // If we have current listing, still show it even on error
          if (currentListing) {
            const currentNetid = currentListing.user_netid;
            const currentEmail = currentListing.user_email?.split("@")[0];
            const matchesSeller = 
              (currentNetid && currentNetid.toLowerCase() === username.toLowerCase()) ||
              (currentEmail && currentEmail.toLowerCase() === username.toLowerCase());
            if (matchesSeller) {
              setSellerListings([currentListing]);
            }
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [username, currentListing]);

  // Get seller info from first listing (or use mock data)
  const sellerInfo = sellerListings.length > 0
    ? {
        username: sellerListings[0].user_netid || sellerListings[0].user_email?.split("@")[0] || username,
        name: sellerListings[0].user_netid || sellerListings[0].user_email?.split("@")[0] || username,
        location: sellerListings[0].location || "Not specified",
        memberSince: sellerListings[0].created_at || new Date().toISOString(),
        activeListings: sellerListings.filter((l) => l.status === "active").length,
        soldItems: sellerListings.filter((l) => l.status === "sold").length,
      }
    : {
        username: username,
        name: username,
        location: "Not specified",
        memberSince: new Date().toISOString(),
        activeListings: 0,
        soldItems: 0,
      };

  // Apply category filter
  let filteredListings =
    selectedCategory === "all"
      ? sellerListings
      : sellerListings.filter((listing) => listing.category === selectedCategory);

  // Apply sorting
  switch (sortBy) {
    case "price-asc":
      filteredListings = [...filteredListings].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      filteredListings = [...filteredListings].sort((a, b) => b.price - a.price);
      break;
    case "newest":
      filteredListings = [...filteredListings].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
    default:
      break;
  }

  // Get unique categories
  const categories = [
    "all",
    ...new Set(sellerListings.map((l) => l.category).filter(Boolean)),
  ];

  const formatMemberSince = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMessageSeller = () => {
    // TODO: Implement message seller functionality
    console.log("Message seller:", username);
  };

  if (loading) {
    return (
      <div className="seller-profile-page">
        <div className="seller-profile-container">
          <div style={{ padding: "48px 0", display: "flex", justifyContent: "center" }}>
            <Spinner />
          </div>
        </div>
      </div>
    );
  }

  // Don't show "not found" immediately - show profile even with 0 listings
  // The seller might exist but just not have any listings yet

  return (
    <div className="seller-profile-page">
      <div className="seller-profile-container">
        {/* Back Button */}
        <button
          className="seller-profile-back-button"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft className="seller-profile-back-icon" />
          Back
        </button>

        {/* Seller Profile Header */}
        <div className="seller-profile-header">
          <div className="seller-profile-header-content">
            {/* Avatar */}
            <div className="seller-profile-avatar">
              <div className="seller-profile-avatar-fallback">
                {getInitials(sellerInfo.name)}
              </div>
            </div>

            {/* Seller Info */}
            <div className="seller-profile-info">
              <div className="seller-profile-name-section">
                <div>
                  <h1 className="seller-profile-name">{sellerInfo.name}</h1>
                  <p className="seller-profile-username">@{sellerInfo.username}</p>
                </div>
                <button
                  className="seller-profile-message-button"
                  onClick={handleMessageSeller}
                >
                  <FaCommentDots className="seller-profile-message-icon" />
                  Message Seller
                </button>
              </div>

              <div className="seller-profile-meta">
                <div className="seller-profile-meta-item">
                  <FaMapMarkerAlt className="seller-profile-meta-icon" />
                  {sellerInfo.location}
                </div>
                <div className="seller-profile-meta-item">
                  <FaCalendar className="seller-profile-meta-icon" />
                  Member since {formatMemberSince(sellerInfo.memberSince)}
                </div>
              </div>

              {/* Stats */}
              <div className="seller-profile-stats">
                <div className="seller-profile-stat">
                  <div className="seller-profile-stat-value">
                    {sellerInfo.activeListings}
                  </div>
                  <div className="seller-profile-stat-label">Active Listings</div>
                </div>
                <div className="seller-profile-stat">
                  <div className="seller-profile-stat-value">
                    {sellerInfo.soldItems}
                  </div>
                  <div className="seller-profile-stat-label">Items Sold</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="seller-profile-filters">
          {/* Category Filter */}
          <select
            className="seller-profile-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            className="seller-profile-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>

          {/* Results Count */}
          <div className="seller-profile-results-count">
            {filteredListings.length}{" "}
            {filteredListings.length === 1 ? "listing" : "listings"}
          </div>
        </div>

        {/* Listings Grid */}
        {filteredListings.length > 0 ? (
          <ListingGrid items={filteredListings} />
        ) : (
          <Empty
            title="No listings found"
            body={
              selectedCategory === "all"
                ? "This seller doesn't have any active listings yet."
                : `This seller doesn't have any ${selectedCategory} listings.`
            }
          />
        )}
      </div>
    </div>
  );
}

