import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState(null);
  const [originalListing, setOriginalListing] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    // TODO: Placeholder for fetching listing data
    const fetchListingData = async () => {
      console.log(`Fetching data for listing ${id}...`);
      // TODO: Replace with actual API call
      const mockData = {
        title: "Sample MacBook Pro",
        description: "This is a great laptop.",
        price: "1150",
        category: "Electronics",
      };
      setTitle(mockData.title);
      setDescription(mockData.description);
      setPrice(mockData.price);
      setCategory(mockData.category);
      setOriginalListing(mockData);
    };

    fetchListingData();
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsConfirming(true);
  };

  const handleConfirmSubmit = async () => {
    const updatedData = { title, description, price, category, file };
    console.log("Submitting changes:", updatedData);

    // TODO: Replace with actual API call
    try {
      console.log(`Sending updated data for listing ${id} to the API...`);
      // const response = await fetch(`/api/listings/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updatedData),
      // });
      // if (!response.ok) throw new Error('Network response was not ok');
      // const result = await response.json();
      // console.log('API response:', result);

      setIsConfirming(false);
      navigate("/my-listings"); // Redirect after successful submission
      // TODO: update with project-level alert in future
      alert("Updated successfully")
    } catch (error) {
      console.error("Failed to update listing:", error);
      // TODO: Handle API errors (e.g., show a notification to the user)
    }
  };

  const getChanges = () => {
    const changes = {};
    if (!originalListing) return changes;

    if (title !== originalListing.title) {
      changes.title = { from: originalListing.title, to: title };
    }
    if (description !== originalListing.description) {
      changes.description = { from: originalListing.description, to: description };
    }
    if (price !== originalListing.price) {
      changes.price = { from: originalListing.price, to: price };
    }
    if (category !== originalListing.category) {
      changes.category = { from: originalListing.category, to: category };
    }
    if (file) {
      changes.file = { from: "No file selected", to: file.name };
    }
    return changes;
  };

  const changes = getChanges();


  return (
    <div
      style={{
        textAlign: "center",
        width: "600px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      {isConfirming && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2>Confirm Your Changes</h2>
            {Object.keys(changes).length > 0 ? (
              <ul style={styles.changesList}>
                {Object.entries(changes).map(([key, value]) => (
                  <li key={key} style={styles.changeItem}>
                    <strong style={{ textTransform: 'capitalize' }}>{key}</strong>
                    <p style={styles.changeDetail}>
                      <span style={{ textDecoration: 'line-through', color: '#777' }}>{value.from}</span> → <strong>{value.to}</strong>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No changes were made.</p>
            )}
            <div style={styles.buttonGroup}>
              <button onClick={handleConfirmSubmit} style={styles.confirmButton}>Confirm</button>
              <button onClick={() => setIsConfirming(false)} style={styles.backButton}>Back to Edit</button>
            </div>
          </div>
        </div>
      )}

      <h1 style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "2rem" }}>
        Edit Listing
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
          Save Changes
        </button>
      </form>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
    color: '#333',
  },
  changesList: {
    listStyleType: 'none',
    padding: 0,
    textAlign: 'left',
  },
  changeItem: {
    marginBottom: '1rem',
  },
  changeDetail: {
    margin: '0.5rem 0',
  },
  buttonGroup: {
    marginTop: '2rem',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
  },
  confirmButton: {
    backgroundColor: '#56018D',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  backButton: {
    backgroundColor: '#eee',
    color: '#333',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};


export default EditListing;
