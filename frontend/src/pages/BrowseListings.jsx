import React, { useEffect, useMemo, useState } from "react";
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

const PAGE_SIZE = 20; // should match backend pagination

const sortToOrdering = (sort) => {
  switch (sort) {
    case "price_asc": return "price";
    case "price_desc": return "-price";
    case "oldest": return "created_at";
    case "newest": return "-created_at";
    case "title_asc": return "title";
    case "title_desc": return "-title";
    default: return "-created_at";
  }
};

const dateRangeToPostedWithin = (dateRange) => {
  if (dateRange === "24h") return 1;
  if (dateRange === "7d") return 7;
  if (dateRange === "30d") return 30;
  return undefined;
};

export default function BrowseListings() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // URL → state
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, Number(params.get("page") ?? 1));

  const initialFiltersFromUrl = {
    category: params.get("category") ?? "",
    location: params.get("location") ?? "",
    dateRange: params.get("dateRange") ?? "",
    priceMin: params.get("min_price") ?? "",
    priceMax: params.get("max_price") ?? "",
    availableOnly: params.get("availableOnly") === "1" ? true : false,
  };

  const [filters, setFilters] = useState(initialFiltersFromUrl);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep URL in sync when filters change
  const syncUrl = (nextFilters, overrides = {}) => {
    const next = new URLSearchParams(params);
    // search
    if (overrides.q !== undefined) {
      if (overrides.q) next.set("q", overrides.q); else next.delete("q");
    }
    // sort
    if (overrides.sort !== undefined) {
      if (overrides.sort) next.set("sort", overrides.sort); else next.delete("sort");
    }
    // page
    if (overrides.page !== undefined) {
      next.set("page", String(overrides.page));
    } else {
      next.set("page", "1");
    }
    // filters
    if (nextFilters.category) next.set("category", nextFilters.category); else next.delete("category");
    if (nextFilters.location) next.set("location", nextFilters.location); else next.delete("location");
    if (nextFilters.priceMin !== "" && nextFilters.priceMin != null) next.set("min_price", nextFilters.priceMin); else next.delete("min_price");
    if (nextFilters.priceMax !== "" && nextFilters.priceMax != null) next.set("max_price", nextFilters.priceMax); else next.delete("max_price");
    if (nextFilters.dateRange) next.set("dateRange", nextFilters.dateRange); else next.delete("dateRange");
    if (nextFilters.availableOnly) next.set("availableOnly", "1"); else next.delete("availableOnly");

    setParams(next, { replace: false });
  };

  // When URL changes externally (e.g., back/forward), update state
  useEffect(() => {
    setFilters({
      category: params.get("category") ?? "",
      location: params.get("location") ?? "",
      dateRange: params.get("dateRange") ?? "",
      priceMin: params.get("min_price") ?? "",
      priceMax: params.get("max_price") ?? "",
      availableOnly: params.get("availableOnly") === "1",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  // Fetch listings from backend (server-side filters)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const apiParams = {};

        // search param for DRF SearchFilter
        if (q) apiParams.search = q;

        // ordering mapping
        apiParams.ordering = sortToOrdering(sort);

        // filters → backend params
        if (filters.category) apiParams.category = filters.category;
        if (filters.location) apiParams.location = filters.location;
        if (filters.priceMin !== "" && filters.priceMin != null) apiParams.min_price = filters.priceMin;
        if (filters.priceMax !== "" && filters.priceMax != null) apiParams.max_price = filters.priceMax;
        if (filters.dateRange) {
          const postedWithin = dateRangeToPostedWithin(filters.dateRange);
          if (postedWithin !== undefined) apiParams.posted_within = postedWithin;
        }
        if (filters.availableOnly) apiParams.available_only = true;

        // Add extra filter fields if present (for extensibility)
        Object.keys(filters).forEach((key) => {
          if (!(key in apiParams) && filters[key] !== "" && filters[key] != null) {
            apiParams[key] = filters[key];
          }
        });

        // pagination
        apiParams.page = page;

        const result = await getListings(apiParams);

        if (!cancelled) {
          if (Array.isArray(result)) {
            setData({ results: result, count: result.length });
          } else if (result && typeof result === "object" && "results" in result) {
            setData(result);
          } else {
            setData({ results: [], count: 0 });
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Error loading listings:", e);
          setError(e?.response?.data?.message || e?.message || "Failed to load listings");
          setData({ results: [], count: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [q, sort, page, filters]); // refetch when any input changes

  // Handlers
  const handleSearch = (nextQ) => {
  // Prevent whitespace-only search
  if (nextQ && nextQ.trim().length === 0) return;
  syncUrl(filters, { q: nextQ ?? "", page: 1 });
  };

  const handleSort = (nextSort) => {
    syncUrl(filters, { sort: nextSort, page: 1 });
  };

  const handlePage = (nextPage) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next, { replace: false });
  };

  const handleFiltersChange = (nextFilters) => {
    setFilters(nextFilters);
    syncUrl(nextFilters, { page: 1 });
  };

  const totalCount = data?.count ?? 0;
  const items = useMemo(() => data?.results ?? [], [data]);

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
            <Filters initial={filters} onChange={handleFiltersChange} />
          </aside>

          {/* Right Content Area */}
          <main>
            {/* Sort and Count */}
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

            {/* Loading */}
            {loading && (
              <div style={{ padding: "48px 0", display: "flex", justifyContent: "center" }}>
                <Spinner />
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <ErrorBlock message="Something went wrong." onRetry={() => window.location.reload()} />
            )}

            {/* Empty */}
            {!loading && !error && items.length === 0 && (
              <Empty
                title={q ? `No results for "${q}"` : "No results"}
                body={q
                  ? "No items match your search. Try different keywords or clear filters."
                  : "No active listings yet."
                }
              />
            )}

            {/* Results */}
            {!loading && !error && items.length > 0 && (
              <>
                <ListingGrid items={items} />
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