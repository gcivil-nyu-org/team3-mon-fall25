import React, { useState } from "react";
import { createListing } from "@/api/listings.js";

const CreateListing = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try{
        const payload = {
            category,
            title,
            description,
            price,
        };

        await createListing(payload);
        setTitle(""); setDescription(""); setPrice(""); setCategory(""); setFile(null);
    }catch (err){
        const msg =
            err.response?.data?.detail ||
            err.response?.data||
            err.message||
            "Failed to create listing";
        console.log(msg)
    }
  };

  return (
    <div
      style={{
        textAlign: "center",
        width: "600px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "2rem" }}>
        Create a New Listing
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            fontSize: "1rem",
          }}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            fontSize: "1rem",
          }}
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            fontSize: "1rem",
          }}
        />
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            fontSize: "1rem",
          }}
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#fff",
          }}
        />
        <button
          type="submit"
          style={{
            backgroundColor: "#fff",
            color: "#56018D",
            padding: "14px 0",
            fontSize: "1.2rem",
            fontWeight: "600",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#e9ddf5")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#fff")}
        >
          Submit Listing
        </button>
      </form>
    </div>
  );
};

export default CreateListing;
