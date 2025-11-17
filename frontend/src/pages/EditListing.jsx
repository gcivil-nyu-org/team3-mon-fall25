import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getListing, updateListing } from "../api/listings";
import { formatFileSize, validateImageFiles } from "../utils/fileUtils";
import { CATEGORIES, LOCATIONS } from "../constants/filterOptions";

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImageIds, setRemoveImageIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Use hardcoded filter options
  const filterOptions = { categories: CATEGORIES, locations: LOCATIONS };

  // Fetch listing data
  useEffect(() => {
    const fetchListingData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getListing(id);

        setTitle(data.title || "");
        setDescription(data.description || "");
        setPrice(data.price?.toString() || "");
        setCategory(data.category || "");
        setLocation(data.dorm_location || data.location || "");
        setExistingImages(data.images || []);
      } catch (error) {
        console.error("Failed to fetch listing:", error);
        setError("Failed to load listing. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchListingData();
  }, [id]);

  const handleNewImagesChange = (e) => {
    const files = Array.from(e.target.files);
    setError("");

    const totalImages = existingImages.length - removeImageIds.length + files.length;

    if (totalImages > 10) {
      setError(`Maximum 10 images allowed. You currently have ${existingImages.length - removeImageIds.length} images.`);
      e.target.value = ""; // Clear the input
      return;
    }

    // Validate file sizes
    const validation = validateImageFiles(files);
    if (!validation.valid) {
      setError(validation.error);
      e.target.value = ""; // Clear the input
      setNewImages([]);
      return;
    }

    setNewImages(files);
  };

  const toggleRemoveImage = (imageId) => {
    setRemoveImageIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      setSaving(false);
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      setSaving(false);
      return;
    }
    if (!price || Number(price) <= 0) {
      setError("Price must be greater than 0");
      setSaving(false);
      return;
    }
    if (!category) {
      setError("Please select a category");
      setSaving(false);
      return;
    }
    if (!location) {
      setError("Please select a location");
      setSaving(false);
      return;
    }

    // Validate new images before submission
    if (newImages.length > 0) {
      const validation = validateImageFiles(newImages);
      if (!validation.valid) {
        setError(validation.error);
        setSaving(false);
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
      formData.append("dorm_location", location);

      // Append new images
      newImages.forEach((image) => {
        formData.append("new_images", image);
      });

      // Append remove_image_ids as JSON string
      if (removeImageIds.length > 0) {
        formData.append("remove_image_ids", JSON.stringify(removeImageIds));
      }

      // Send PATCH request using updateListing API function
      await updateListing(id, formData);

      // Redirect to My Listings page
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
          "Failed to update listing";
        setError(String(msg));
      }
      console.error("Update listing error:", err);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: "#F5F5F5", minHeight: "calc(100vh - 64px)", padding: "60px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <p>Loading listing...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#F5F5F5", minHeight: "calc(100vh - 64px)", padding: "60px 24px" }}>
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 8,
            color: "#111",
            textAlign: "center",
          }}
        >
          Edit Listing
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#6b7280",
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Update your listing details
        </p>

        {error && (
          <div
            style={{
              background: "#FEE2E2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              padding: 12,
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Title *
            </label>
            <input
              id="title"
              type="text"
              placeholder="e.g., MacBook Pro 16'' 2021"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                fontSize: 15,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#56018D")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={saving}
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
              onFocus={(e) => (e.target.style.borderColor = "#56018D")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            >
              <option value="">Select a category</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location/Dorm */}
          <div>
            <label
              htmlFor="location"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Location (Dorm) *
            </label>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={saving}
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
              onFocus={(e) => (e.target.style.borderColor = "#56018D")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            >
              <option value="">Select your location</option>
              {filterOptions.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Description *
            </label>
            <textarea
              id="description"
              placeholder="Describe your item in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
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
              onFocus={(e) => (e.target.style.borderColor = "#56018D")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor="price"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Price ($) *
            </label>
            <input
              id="price"
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={saving}
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
              onFocus={(e) => (e.target.style.borderColor = "#56018D")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Existing Images
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {existingImages.map((img) => (
                  <div
                    key={img.image_id}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: removeImageIds.includes(img.image_id)
                        ? "2px solid #ef4444"
                        : "1px solid #E5E7EB",
                    }}
                  >
                    <img
                      src={img.image_url}
                      alt="Listing"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: removeImageIds.includes(img.image_id) ? 0.5 : 1,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleRemoveImage(img.image_id)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: removeImageIds.includes(img.image_id) ? "#ef4444" : "#fff",
                        color: removeImageIds.includes(img.image_id) ? "#fff" : "#111",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {removeImageIds.includes(img.image_id) ? "Undo" : "Remove"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Images */}
          <div>
            <label
              htmlFor="newImages"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Add New Images (optional)
            </label>
            <input
              id="newImages"
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewImagesChange}
              disabled={saving}
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
              Up to 10 images total. Maximum 10MB per image, 100MB total.
              {newImages.length > 0 && ` ${newImages.length} new selected`}
            </p>
            {newImages.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {newImages.map((file, index) => {
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
                  Total: {formatFileSize(newImages.reduce((sum, file) => sum + file.size, 0))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              background: saving ? "#9ca3af" : "#56018D",
              color: "#fff",
              padding: "14px 0",
              fontSize: 16,
              fontWeight: 600,
              border: "none",
              borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
              marginTop: 12,
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => !saving && (e.target.style.filter = "brightness(1.1)")}
            onMouseOut={(e) => !saving && (e.target.style.filter = "brightness(1)")}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditListing;
