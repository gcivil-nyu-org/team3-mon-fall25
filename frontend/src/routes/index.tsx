// Application routes configuration.
import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import Home from "../pages/Home";
import CreateListing from "../pages/CreateListing";
import App from "../App";
import MyListings from "../pages/MyListings";
import ListingDetail from "../pages/ListingDetail";
import EditListing from "../pages/EditListing";
import Login from "../pages/Login";

export default function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route - Login page */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes - require authentication */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/listing/:id/edit" element={<EditListing />} />
            <Route path="/create-listing" element={<CreateListing />} />
            <Route path="/my-listings" element={<MyListings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

