import React from "react";
import { useNavigate } from "react-router-dom";
import ListingCardBuyer from "../ListingCardBuyer";

export default function ListingGrid({ items }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20 }}>
      {items.map((item) => {
        const id = item.listing_id || item.id;
        const imageUrl =
          item?.primary_image?.url ||
          item?.images?.[0]?.image_url ||
          item?.images?.[0]?.url ||
          item?.primary_image ||
          item?.images?.[0] ||
          item?.thumbnail_url;

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
  );
}
