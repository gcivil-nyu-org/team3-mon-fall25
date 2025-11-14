import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createListing } from "../api/listings";
import SEO from "../components/SEO";
import { formatFileSize, validateImageFiles } from "../utils/fileUtils";

// Match these with the Filters component options
const CATEGORIES = ["Electronics", "Books", "Furniture", "Sports", "Clothing", "Other"];
const DORMS = [
  "Othmer Hall",
  "Clark Hall",
  "Rubin Hall",
  "Weinstein Hall",
  "Brittany Hall",
  "Founders Hall",
];

const CreateListing = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setError("");
    
    if (files.length > 10) {
      setError("Maximum 10 images allowed");
      return;
    }
    
    // Validate file sizes
    const validation = validateImageFiles(files);
    if (!validation.valid) {
      setError(validation.error);
      e.target.value = ""; // Clear the input
      setImages([]);
      return;
    }
    
    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      setLoading(false);
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      setLoading(false);
      return;
    }
    if (!price || Number(price) <= 0) {
      setError("Price must be greater than 0");
      setLoading(false);
      return;
    }
    if (!category) {
      setError("Please select a category");
      setLoading(false);
      return;
    }
    if (!location) {
      setError("Please select a location");
      setLoading(false);
      return;
    }

    // Validate images before submission
    if (images.length > 0) {
      const validation = validateImageFiles(images);
      if (!validation.valid) {
        setError(validation.error);
        setLoading(false);
        return;
      }
    }

    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("price", Number(price));
      formData.append("category", category);
      formData.append("location", location);

      // Append all images
      images.forEach((image) => {
        formData.append("images", image);
      });

      // Send request using createListing API function
      await createListing(formData);

      // Redirect immediately to My Listings page
      navigate("/my-listings");
    } catch (err) {
      // Handle 413 errors specifically
      if (err.response?.status === 413) {
        setError("File(s) are too large. Please reduce image size and try again.");
      } else {
        const msg =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Failed to create listing";
        setError(String(msg));
      }
      console.error("Create listing error:", err);
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Create Listing - NYU Marketplace"
        description="Post your item in minutes and reach NYU students on campus."
        canonical="http://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com/create-listing"
      />

      <div style={{ background: "#F5F5F5", minHeight: "calc(100vh - 64px)", padding: "60px 24px" }}>
        <div style={{
          maxWidth: 600,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 8,
            color: "#111",
            textAlign: "center",
          }}>
            Create a New Listing
          </h1>
          <p style={{
            fontSize: 15,
            color: "#6b7280",
            textAlign: "center",
            marginBottom: 32,
          }}>
            Fill in the details to list your item
          </p>

          {error && (
            <div style={{
              background: "#FEE2E2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              padding: 12,
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Title */}
            <div>
              <label htmlFor="title" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Title *
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g., MacBook Pro 16'' 2021"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 15,
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#56018D"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 15,
                  outline: "none",
                  background: "#fff",
                  cursor: "pointer",
                }}
                onFocus={(e) => e.target.style.borderColor = "#56018D"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location/Dorm */}
            <div>
              <label htmlFor="location" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Location (Dorm) *
              </label>
              <select
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 15,
                  outline: "none",
                  background: "#fff",
                  cursor: "pointer",
                }}
                onFocus={(e) => e.target.style.borderColor = "#56018D"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
              >
                <option value="">Select your dorm</option>
                {DORMS.map((dorm) => (
                  <option key={dorm} value={dorm}>
                    {dorm}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Description *
              </label>
              <textarea
                id="description"
                placeholder="Describe your item in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={5}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 15,
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.borderColor = "#56018D"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Price ($) *
              </label>
              <input
                id="price"
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={loading}
                min="0"
                step="0.01"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 15,
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#56018D"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
              />
            </div>

            {/* Multiple Image Upload */}
            <div>
              <label htmlFor="images" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Images (optional)
              </label>
              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 14,
                  background: "#fff",
                  cursor: "pointer",
                }}
              />
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                You can upload up to 10 images. Maximum 10MB per image, 100MB total.
                {images.length > 0 && ` ${images.length} selected`}
              </p>
              {images.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {images.map((file, index) => {
                    const fileSize = formatFileSize(file.size);
                    const isLarge = file.size > 8 * 1024 * 1024; // > 8MB
                    return (
                      <div
                        key={index}
                        style={{
                          fontSize: 12,
                          color: isLarge ? "#dc2626" : "#6b7280",
                          marginTop: 4,
                          padding: "4px 8px",
                          background: isLarge ? "#fef2f2" : "#f9fafb",
                          borderRadius: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{file.name}</span>
                        <span style={{ fontWeight: 600 }}>{fileSize}</span>
                      </div>
                    );
                  })}
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid #e5e7eb",
                      fontWeight: 600,
                    }}
                  >
                    Total: {formatFileSize(images.reduce((sum, file) => sum + file.size, 0))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "#9ca3af" : "#56018D",
                color: "#fff",
                padding: "14px 0",
                fontSize: 16,
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 12,
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => !loading && (e.target.style.filter = "brightness(1.1)")}
              onMouseOut={(e) => !loading && (e.target.style.filter = "brightness(1)")}
            >
              {loading ? "Creating..." : "Create Listing"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateListing;
