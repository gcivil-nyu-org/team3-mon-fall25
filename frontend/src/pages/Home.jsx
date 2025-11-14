import { Link } from "react-router-dom";
import logoImage from "../assets/images/nyu-marketplace-logo.png";
import SEO from "../components/SEO";

export default function Home(){

  return (
    <>
      <SEO
        title="NYU Marketplace - Buy & Sell on Campus"
        description="Buy and sell with fellow NYU students. Find great deals on textbooks, furniture, electronics, and more."
        canonical="http://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com/"
      />

      {/* Hero Section */}
      <section style={{ background: "#F5F5F5", padding: "100px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
          <div style={{ marginBottom: 10 }}>
            <img 
              src={logoImage} 
              alt="NYU Marketplace"
              style={{ 
                height: "200px",
                margin: "0 auto",
                display: "block"
              }}
            />
          </div>
          <p style={{
            margin: "10px auto 0",
            color: "#6b7280",
            maxWidth: 600,
            fontSize: 17,
            lineHeight: 1.6
          }}>
            Buy and sell with fellow NYU students. Find great deals on textbooks, furniture, electronics, and more.
          </p>

          <div style={{
            marginTop: 40,
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap"
          }}>
            <Link
              to="/browse"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: "none",
                background: "#56018D",
                color: "#fff",
                border: "none",
                fontSize: 15,
              }}
            >
              <span aria-hidden>🔎</span>
              Browse Listings
            </Link>
            <Link
              to="/create-listing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: "none",
                background: "#fff",
                color: "#56018D",
                border: "2px solid #56018D",
                fontSize: 15,
              }}
            >
              <span aria-hidden>➕</span>
              Create Listing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section style={{ padding: "40px 24px", background: "#F5F5F5" }}>
        <div style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 50,
        }}>
          {/* Card 1: Easy to Find */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 90,
              height: 90,
              margin: "0 auto 20px",
              borderRadius: "50%",
              background: "#E9DDF5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}>
              🔍
            </div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#111" }}>
              Easy to Find
            </h3>
            <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>
              Search and filter through listings to find exactly what you need
            </p>
          </div>

          {/* Card 2: Safe & Secure */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 90,
              height: 90,
              margin: "0 auto 20px",
              borderRadius: "50%",
              background: "#E9DDF5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}>
              🛡️
            </div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#111" }}>
              Safe & Secure
            </h3>
            <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>
              Connect only with verified NYU students in your dorm community
            </p>
          </div>

          {/* Card 3: Great Deals */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 90,
              height: 90,
              margin: "0 auto 20px",
              borderRadius: "50%",
              background: "#E9DDF5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}>
              📈
            </div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#111" }}>
              Great Deals
            </h3>
            <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>
              Find affordable items from students who know what you need
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA Section */}
      <section style={{
        background: "#56018D",
        padding: "80px 24px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.9)" }}>
            Ready to get started?
          </p>
          <h2 style={{
            margin: "16px 0 0",
            fontSize: 24,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.4,
          }}>
            Join hundreds of NYU students buying and selling on campus
          </h2>
          <Link
            to="/browse"
            style={{
              display: "inline-block",
              marginTop: 36,
              padding: "12px 28px",
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: "none",
              background: "#fff",
              color: "#56018D",
              fontSize: 15,
            }}
          >
            Start Browsing
          </Link>
        </div>
      </section>
    </>
  );
}
