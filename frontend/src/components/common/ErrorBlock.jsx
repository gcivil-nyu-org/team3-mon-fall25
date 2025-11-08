import React from "react";

export default function ErrorBlock({ message = "Error", onRetry }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "#dc2626" }}>{message}</h2>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
