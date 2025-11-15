import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";

import ProtectedRoute from "./components/ProtectedRoute";
import App from "./App";

import Home from "./pages/Home";
import BrowseListings from "./pages/BrowseListings";
import ListingDetail from "./pages/ListingDetail";

import CreateListing from "./pages/CreateListing";
import MyListings from "./pages/MyListings";
import EditListing from "./pages/EditListing";
import Login from "./pages/Login";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile";
import SellerProfile from "./pages/SellerProfile";
import Watchlist from "./pages/Watchlist";

export default function AppRouter() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <Routes>
            {/* Public login page */}
            <Route path="/login" element={<Login />} />

            {/* Shared layout (navbar + outlet) */}
            <Route path="/" element={<App />}>
              {/* ✅ PUBLIC routes */}
              <Route index element={<Home />} />
              <Route path="browse" element={<BrowseListings />} />
              <Route path="listing/:id" element={<ListingDetail />} />

              {/* 🔒 PROTECTED routes */}
              <Route
                path="create-listing"
                element={
                  <ProtectedRoute>
                    <CreateListing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my-listings"
                element={
                  <ProtectedRoute>
                    <MyListings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="listing/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditListing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="watchlist"
                element={
                  <ProtectedRoute>
                    <Watchlist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="chat/:conversationId"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="seller/:username"
                element={
                  <ProtectedRoute>
                    <SellerProfile />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback → home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
}
