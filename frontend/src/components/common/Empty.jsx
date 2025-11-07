export default function Empty({ title, body }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>{title}</h2>
      {body && <p style={{ color: "#6b7280", marginTop: 8 }}>{body}</p>}
    </div>
  );
}
