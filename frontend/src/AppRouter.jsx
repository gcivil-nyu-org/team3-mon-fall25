import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { NotificationProvider } from "./contexts/NotificationContext";

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
import Profile from "./pages/Profile";
import Watchlist from "./pages/Watchlist";
import TransactionPaymentPage from "./pages/TransactionPaymentPage";
import MyOrdersPage from "./pages/MyOrdersPage";

import { ROUTES } from "./constants/routes";

import GlobalChat from "./components/chat/GlobalChat";

export default function AppRouter() {
    return (
        <AuthProvider>
            <ChatProvider>
                <BrowserRouter>
                    <GlobalChat />

                    <NotificationProvider>
                        <Routes>
                            {/* Public login + OTP routes */}
                            <Route path={ROUTES.LOGIN} element={<Login />} />
                            <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />

                            {/* Profile completion (still requires auth) */}
                            <Route
                                path={ROUTES.COMPLETE_PROFILE}
                                element={
                                    <ProtectedRoute>
                                        <CreateProfile />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Shared layout (navbar + outlet) */}
                            <Route path={ROUTES.HOME} element={<App />}>
                                {/* ✅ PUBLIC routes (no ProfileGate / ProtectedRoute) */}
                                <Route index element={<Home />} />
                                <Route path="browse" element={<BrowseListings />} />
                                <Route path="listing/:id" element={<ListingDetail />} />
                                <Route path="dev/transaction" element={<TransactionPaymentPage />} />

                                {/* 🔒 GATED routes: ProfileGate + ProtectedRoute */}
                                <Route element={<ProfileGate />}>
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
                                        path="orders"
                                        element={
                                            <ProtectedRoute>
                                                <MyOrdersPage />
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route
                                        path="transaction/:id"
                                        element={
                                            <ProtectedRoute>
                                                <TransactionPaymentPage />
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

                                    {/* Chat routes – still gated by ProfileGate + auth */}
                                    <Route
                                        path="chat"
                                        element={
                                            <ProtectedRoute>
                                                <div style={{ minHeight: "100vh" }} />
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route
                                        path="chat/:conversationId"
                                        element={
                                            <ProtectedRoute>
                                                <div style={{ minHeight: "100vh" }} />
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
                                        path="profile/:username"
                                        element={
                                            <ProtectedRoute>
                                                <Profile />
                                            </ProtectedRoute>
                                        }
                                    />
                                </Route>
                            </Route>

                            {/* Fallback → home (public) */}
                            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
                        </Routes>
                    </NotificationProvider>
                </BrowserRouter>
            </ChatProvider>
        </AuthProvider>
    );
}
