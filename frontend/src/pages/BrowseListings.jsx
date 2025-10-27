import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import Filters from "../components/Filters";
import { getListings } from "../api/listings";
import ListingCardBuyer from "../components/ListingCardBuyer";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function BrowseListings() {
  const navigate = useNavigate();
  const query = useQuery();

  const [q, setQ] = useState(query.get("q") || "");
  const [sort, setSort] = useState(query.get("ordering") || "-created_at");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(Number(query.get("page") || 1));

  const [data, setData] = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pageSize = 12;
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((data?.count || 0) / pageSize)),
    [data?.count]
  );

  // sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort) params.set("ordering", sort);
    if (page > 1) params.set("page", String(page));
    Object.entries(filters).forEach(([k, v]) => (v !== "" && v != null ? params.set(k, v) : null));
    const next = `/browse${params.toString() ? `?${params}` : ""}`;
    const current = window.location.pathname + window.location.search;
    if (next !== current) navigate(next, { replace: true });
  }, [q, sort, page, filters, navigate]);

  // load listings
  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await getListings({
        q: q || undefined,
        ordering: sort || undefined,
        page,
        page_size: pageSize,
        ...filters,
      });
      // normalize array vs DRF pagination
      const normalized = Array.isArray(res)
        ? { results: res, count: res.length }
        : { results: res.results ?? [], count: Number(res.count ?? res.results?.length ?? 0) };
      setData(normalized);
    } catch (e) {
      setError(e?.response?.data || e?.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setPage(1); }, [q, sort, JSON.stringify(filters)]);
  useEffect(() => { load(); }, [q, sort, filters, page]);

  return (
    <main className="container" style={{ padding: 20 }}>
      {/* Search hero */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Search listings</h1>
        <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
          Find great deals from fellow NYU students
        </p>
        <div style={{ maxWidth: 640, margin: "16px auto 0" }}>
          <SearchBar defaultValue={q} onSearch={setQ} placeholder="Search by keywords…" />
        </div>
        <div style={{ marginTop: 12 }}>
          <button style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "8px 12px", background: "#fff" }}>
            Advanced
          </button>
        </div>
      </div>

      {/* Filters + results */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24, marginTop: 24 }}>
        {/* Left rail */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
          <Filters initial={{}} onChange={setFilters} />
        </div>

        {/* Right side */}
        <section>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {loading ? "Loading…" : `Showing ${data.results?.length || 0} of ${data.count || 0}`}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: ".5rem .75rem" }}
            >
              <option value="-created_at">Newest</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>

          {/* Results */}
          <div style={{ marginTop: 16 }}>
            {error && (
              <div style={{ border:"1px solid #fecaca", color:"#b91c1c", background:"#fef2f2", borderRadius:12, padding:12 }}>
                {String(error)}
              </div>
            )}

            {loading && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ aspectRatio:"4/3", border:"1px solid #e5e7eb", borderRadius:16, background:"#f7f7f7" }} />
                ))}
              </div>
            )}

            {!loading && !error && data?.results?.length === 0 && (
              <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:24, textAlign:"center", color:"#6b7280" }}>
                No listings match your filters.
              </div>
            )}

            {!loading && !error && data?.results?.length > 0 && (
              <>
                {/* 👉 THIS IS THE GRID YOU ASKED ABOUT */}
                <div
                  className="listings-grid"
                  style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:16 }}
                >
                  {data.results.map((item) => {
                    const id = item.listing_id || item.id;
                    const imageUrl =
                      item?.primary_image?.url ||
                      item?.images?.[0]?.url ||
                      item?.primary_image ||
                      item?.images?.[0];

                    return (
                      <ListingCardBuyer
                        key={id}
                        id={id}
                        title={item.title}
                        price={item.price}
                        status={item.status}
                        location={item.location}
                        imageUrl={imageUrl}
                        onClick={() => navigate(`/listing/${id}`)}
                      />
                    );
                  })}
                </div>

                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onPage={(p) => setPage(Math.max(1, Math.min(pageCount, p)))}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
