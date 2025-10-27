import { Link, useNavigate } from "react-router-dom";

export default function Home(){
  const navigate = useNavigate();

  return (
    <main className="container" style={{ padding: "32px 0 56px" }}>
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(180deg,#ffffff 0%,#fafafb 100%)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: "56px 24px",
          textAlign: "center",
          color: "var(--ink)"
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>NYU Marketplace</h1>
        <p style={{ margin: "12px auto 0", color: "var(--muted)", maxWidth: 760, fontSize: 18, lineHeight: 1.6 }}>
          Buy and sell with fellow NYU students. Find great deals on textbooks, furniture, electronics, and more.
        </p>

        <div style={{ marginTop: 24, display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <Link to="/browse" className="cta cta--primary">
            <span className="cta__icon" aria-hidden>🔎</span>
            Browse Listings
          </Link>
          <Link to="/create-listing" className="cta cta--outline">
            <span className="cta__icon" aria-hidden>👜</span>
            Create Listing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ marginTop: 40 }}>
        <div className="features">
          <div className="feature">
            <div className="feature__icon">🔍</div>
            <h3 className="feature__title">Easy to Find</h3>
            <p className="feature__body">Search and filter through listings to find exactly what you need</p>
          </div>
          <div className="feature">
            <div className="feature__icon">🛡️</div>
            <h3 className="feature__title">Safe & Secure</h3>
            <p className="feature__body">Connect only with verified NYU students in your dorm community</p>
          </div>
          <div className="feature">
            <div className="feature__icon">📉</div>
            <h3 className="feature__title">Great Deals</h3>
            <p className="feature__body">Find affordable items from students who know what you need</p>
          </div>
        </div>
      </section>
    </main>
  );
}
