// Application routes configuration.
import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import CreateListing from "../pages/CreateListing";  //Import page
import App from "../App";
import MyListings from "../pages/MyListings";
import ListingDetail from "../pages/ListingDetail";




export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route path="/my-listings" element={<MyListings />} />
          <Route index element={<Home />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="create-listing" element={<CreateListing />} /> 
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

