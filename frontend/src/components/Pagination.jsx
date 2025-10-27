export default function Pagination({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "24px 0" }}>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}>Prev</button>
      <span style={{ fontSize: 12 }}>Page {page} of {pageCount}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pageCount}>Next</button>
    </div>
  );
}
