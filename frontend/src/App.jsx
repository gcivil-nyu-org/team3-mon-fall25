import React, {useEffect} from "react";
import {Outlet, Link, NavLink, useLocation} from "react-router-dom";
import {useAuth} from "./contexts/AuthContext";
import {useChat} from "./contexts/ChatContext";
import ProfileDropdown from "./components/ProfileDropdown";
import GlobalChatWindow from "./components/GlobalChatWindow";
import {FaComments} from "react-icons/fa";
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import logoImage from "./assets/images/nyu-marketplace-header-logo.png";

export default function App() {
    const {user} = useAuth();
    const {openChat} = useChat();
    const location = useLocation();

    // Track previous path for chat background
    useEffect(() => {
        if (location.pathname !== '/chat' && !location.pathname.startsWith('/chat/')) {
            sessionStorage.setItem('previousPath', location.pathname);
        }
    }, [location.pathname]);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "var(--bg)",      // light page background
                color: "#111",                 // normal text; nav sets its own color
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Global Navbar */}
            <nav>
                <div className="container nav">
                    {/* Brand (left) */}
                    <div className="nav__brand">
                        <img
                            src={logoImage}
                            alt="NYU Marketplace"
                            style={{
                                height: "45px",
                                width: "auto",
                                maxWidth: "90px",
                                marginRight: "12px",
                                borderRadius: "10px",
                                padding: "4px",
                                background: "#ffffff20",  // semi-transparent white for a subtle highlight
                                backdropFilter: "blur(5px)"
                            }}
                        />
                        <span className="nav__brandText">Your Campus, Your Market!</span>
                    </div>

                    {/* Links (right) */}
                    <div className="nav__links">
                        <NavLink to="/" end className="nav__link">
                            Home
                        </NavLink>
                        <NavLink to="/browse" className="nav__link">
                            Browse
                        </NavLink>

                        {user && (
                            <>
                                <NavLink to="/create-listing" className="nav__link">
                                    Create Listing
                                </NavLink>
                                <NavLink to="/my-listings" className="nav__link">
                                    My Listings
                                </NavLink>
                            </>
                        )}

                        {user && (
                            <NavLink to="/watchlist" className="nav__link">
                                Saved
                            </NavLink>
                        )}

                        {user && (
                            <button
                                onClick={() => {
                                    openChat();
                                }}
                                className="nav__link"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "6px 0",
                                    color: "inherit",
                                    font: "inherit",
                                }}
                            >
                                <FaComments style={{fontSize: "16px"}}/>
                                Messages
                            </button>
                        )}

                        {user ? (
                            <ProfileDropdown/>
                        ) : (
                            <Link className="nav__btn nav__btn--invert" to="/login">
                                Login
                            </Link>
                        )}
                    </div>

                </div>
            </nav>


            {/* Page content */}
            <div style={{flex: 1, paddingTop: '64px' /* Account for fixed header */}}>
                <Outlet/>
            </div>

            {/* Global Chat Window - persists across all routes */}
            <GlobalChatWindow/>

            {/* Toast notifications */}
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
        </div>
    );
}
