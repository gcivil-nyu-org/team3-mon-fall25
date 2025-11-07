import React from "react";

export default function Pagination({ page, pageSize, total, onPrev, onNext }) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <button
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#fff",
          cursor: page <= 1 ? "not-allowed" : "pointer",
          opacity: page <= 1 ? 0.5 : 1,
        }}
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        Prev
      </button>
      <span style={{ fontSize: 14 }}>
        Page <strong>{page}</strong> of <strong>{maxPage}</strong>
      </span>
      <button
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#fff",
          cursor: page >= maxPage ? "not-allowed" : "pointer",
          opacity: page >= maxPage ? 0.5 : 1,
        }}
        onClick={onNext}
        disabled={page >= maxPage}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}
