import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SearchBar from "../components/browse/SearchBar";
import SortSelect from "../components/browse/SortSelect";
import Filters from "../components/browse/Filters";
import ListingGrid from "../components/browse/ListingGrid";
import Pagination from "../components/browse/Pagination";
import Spinner from "../components/common/Spinner";
import Empty from "../components/common/Empty";
import ErrorBlock from "../components/common/ErrorBlock";
import { getListings } from "../api/listings";

const PAGE_SIZE = 20;

export default function BrowseListings() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // URL → state (keeping for future use when backend supports filters)
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, Number(params.get("page") ?? 1));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});

  // Fetch listings
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // For now, fetch all listings without query parameters
        // When backend supports filters, we can add them here
        const result = await getListings();

        if (!cancelled) {
          // Normalize the response
          if (Array.isArray(result)) {
            // If API returns array directly
            setData({ results: result, count: result.length });
          } else if (result.results) {
            // If API returns paginated response
            setData(result);
          } else {
            // Fallback
            setData({ results: [], count: 0 });
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Error loading listings:", e);
          setError(e?.response?.data?.message || e?.message || "Failed to load listings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array - fetch once on mount

  // Client-side filtering and sorting (until backend supports it)
  const filteredAndSortedListings = React.useMemo(() => {
    if (!data?.results) return [];

    let filtered = [...data.results];

    // Apply search filter (client-side)
    if (q) {
      const searchLower = q.toLowerCase();
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter (client-side)
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(item =>
        filters.categories.includes(item.category)
      );
    }

    // Apply dorm filter (client-side)
    if (filters.dorms && filters.dorms.length > 0) {
      filtered = filtered.filter(item =>
        filters.dorms.includes(item.location)
      );
    }

    // Apply price range filter (client-side)
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const min = filters.priceMin || 0;
      const max = filters.priceMax || Infinity;
      filtered = filtered.filter(item =>
        item.price >= min && item.price <= max
      );
    }

    // Apply available only filter (client-side)
    if (filters.availableOnly) {
      filtered = filtered.filter(item =>
        item.status?.toLowerCase() === 'active'
      );
    }

    // Apply sorting (client-side)
    if (sort === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sort === "newest") {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return filtered;
  }, [data, q, sort, filters]);

  // Pagination (client-side)
  const paginatedListings = React.useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return filteredAndSortedListings.slice(startIndex, endIndex);
  }, [filteredAndSortedListings, page]);

  // Handlers
  const handleSearch = (nextQ) => {
    const next = new URLSearchParams(params);
    next.set("q", nextQ);
    next.set("page", "1");
    setParams(next, { replace: false });
  };

  const handleSort = (nextSort) => {
    const next = new URLSearchParams(params);
    next.set("sort", nextSort);
    next.set("page", "1");
    setParams(next, { replace: false });
  };

  const handlePage = (nextPage) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next, { replace: false });
  };

  const totalCount = filteredAndSortedListings.length;

  return (
    <>
      {/* Page Title Section */}
      <section style={{ background: "#F5F5F5", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, color: "#111" }}>
            Browse Listings
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 16, color: "#6b7280" }}>
            Find great deals from fellow NYU students
          </p>

          {/* Search Bar */}
          <div style={{ maxWidth: 700, margin: "28px auto 0" }}>
            <SearchBar defaultValue={q} onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div style={{ background: "#F5F5F5", padding: "0 24px 60px" }}>
        <div style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 32,
          alignItems: "start",
        }}>
          {/* Left Sidebar - Filters */}
          <aside style={{ position: "sticky", top: 24 }}>
            <Filters initial={filters} onChange={setFilters} />
          </aside>

          {/* Right Content Area */}
          <main>
            {/* Sort and View Controls */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 14, color: "#6b7280" }}>
                {loading ? "Loading..." : `${totalCount} result${totalCount !== 1 ? 's' : ''}`}
              </div>
              <SortSelect value={sort} onChange={handleSort} />
            </div>

            {/* Loading State */}
            {loading && (
              <div style={{ padding: "48px 0", display: "flex", justifyContent: "center" }}>
                <Spinner />
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <ErrorBlock message="Something went wrong." onRetry={() => window.location.reload()} />
            )}

            {/* Empty State */}
            {!loading && !error && paginatedListings.length === 0 && (
              <Empty
                title="No results"
                body={q ? "Try a different keyword or clearing filters." : "No active listings yet."}
              />
            )}

            {/* Listings Grid */}
            {!loading && !error && paginatedListings.length > 0 && (
              <>
                <ListingGrid items={paginatedListings} />
                <div style={{ marginTop: 32 }}>
                  <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={totalCount}
                    onPrev={() => handlePage(Math.max(1, page - 1))}
                    onNext={() => handlePage(page + 1)}
                  />
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
