import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, CheckCircle, ChevronLeft } from 'lucide-react';
import { getSellerProfile } from '@/api/listings';
import ListingCardBuyer from '@/components/ListingCardBuyer';
import Spinner from '@/components/common/Spinner';
import ErrorBlock from '@/components/common/ErrorBlock';
import Empty from '@/components/common/Empty';
import './SellerProfile.css';

export default function SellerProfile() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSellerProfile(username);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to load seller profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [username]);

  const categories = useMemo(() => {
    if (!profile?.listings) return [];
    const unique = new Set();
    profile.listings.forEach(l => { if (l.category) unique.add(l.category); });
    return Array.from(unique);
  }, [profile?.listings]);

  const filteredSorted = useMemo(() => {
    let items = [...(profile?.listings || [])];
    if (category !== 'all') {
      items = items.filter(l => (l.category || '').toLowerCase() === category.toLowerCase());
    }
    if (sort === 'price_asc') items.sort((a,b) => Number(a.price) - Number(b.price));
    else if (sort === 'price_desc') items.sort((a,b) => Number(b.price) - Number(a.price));
    else items.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return items;
  }, [profile?.listings, category, sort]);

  if (loading) {
    return (
      <div className="seller-profile" style={{ padding: '48px 0', display:'flex', justifyContent:'center' }}>
        <Spinner />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="seller-profile" style={{ padding: '48px 24px' }}>
        <ErrorBlock message={error || 'Seller not found'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="seller-profile">
      <div className="seller-profile__topbar">
        <div className="container">
          <button className="seller-profile__back" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} /> Back
          </button>
        </div>
      </div>
      <section className="seller-profile__header">
        <div className="container">
          <div className="seller-profile__header-content">
            <div className="seller-profile__avatar">
              {profile.display_name?.charAt(0)?.toUpperCase() || profile.username?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="seller-profile__info">
              <h1 className="seller-profile__name">{profile.display_name || profile.username}</h1>
              <p className="seller-profile__username">@{profile.username}</p>
              <p className="seller-profile__member-since">Member since {new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="seller-profile__cta">
              <button className="seller-profile__msg" onClick={() => window.alert('Messaging coming soon')}> <span className="dot" /> Message Seller</button>
            </div>
          </div>
          <div className="seller-profile__stats">
            <div className="seller-profile__stat">
              <Package className="seller-profile__stat-icon" />
              <div className="seller-profile__stat-value">{profile.active_listings_count || 0}</div>
              <div className="seller-profile__stat-label">Active Listings</div>
            </div>
            <div className="seller-profile__stat">
              <CheckCircle className="seller-profile__stat-icon" />
              <div className="seller-profile__stat-value">{profile.total_sold_count || 0}</div>
              <div className="seller-profile__stat-label">Items Sold</div>
            </div>
          </div>
        </div>
      </section>
      <section className="seller-profile__listings">
        <div className="container">
          <div className="seller-profile__toolbar">
            <div className="toolbar-select">
              <select aria-label="Filter by category" value={category} onChange={(e)=>setCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="toolbar-select">
              <select aria-label="Sort listings" value={sort} onChange={(e)=>setSort(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
            <div className="toolbar-count">{filteredSorted.length} listings</div>
          </div>
          {filteredSorted.length ? (
            <div className="seller-profile__grid">
              {filteredSorted.map(listing => (
                <ListingCardBuyer
                  key={listing.listing_id}
                  title={listing.title}
                  price={listing.price}
                  status={listing.status}
                  imageUrl={listing.primary_image}
                  location={listing.dorm}
                  onClick={() => navigate(`/listing/${listing.listing_id}`)}
                />
              ))}
            </div>
          ) : (
            <Empty title="No Active Listings" body="This seller doesn't have any active listings at the moment." />
          )}
        </div>
      </section>
    </div>
  );
}
