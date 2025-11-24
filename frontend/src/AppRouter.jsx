import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";

import ProtectedRoute from "./components/ProtectedRoute";
import ProfileGate from "./components/ProfileGate";
import App from "./App";

import Home from "./pages/Home";
import BrowseListings from "./pages/BrowseListings";
import ListingDetail from "./pages/ListingDetail";

import CreateListing from "./pages/CreateListing";
import MyListings from "./pages/MyListings";
import EditListing from "./pages/EditListing";
import Login from "./pages/Login";
import VerifyEmail from "./pages/VerifyEmail";
import CreateProfile from "./pages/CreateProfile";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile";
import SellerProfile from "./pages/SellerProfile";
import Watchlist from "./pages/Watchlist";
import { ROUTES } from "./constants/routes";

export default function AppRouter() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <Routes>
            {/* Public login + OTP routes */}
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />

            {/* Profile completion */}
            <Route
              path={ROUTES.COMPLETE_PROFILE}
              element={
                <ProtectedRoute>
                  <CreateProfile />
                </ProtectedRoute>
              }
            />

            {/* Shared layout (navbar + outlet) */}
            <Route element={<ProfileGate />}>
              <Route path={ROUTES.HOME} element={<App />}>
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
            </Route>

            {/* Fallback → home */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
}
