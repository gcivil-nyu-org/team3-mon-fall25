import React, {useEffect, useRef} from "react";
import {Outlet, Link, NavLink, useLocation} from "react-router-dom";
import {useAuth} from "./contexts/AuthContext";
import {useChat} from "./contexts/ChatContext";
import {useNotifications} from "./contexts/NotificationContext";
import ProfileDropdown from "./components/ProfileDropdown";
import GlobalChatWindow from "./components/GlobalChatWindow";
import NotificationPanel from "./components/NotificationPanel";
import {FaComments} from "react-icons/fa";
import {Bell} from "lucide-react";
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import logoImage from "./assets/images/nyu-marketplace-header-logo.png";

export default function App() {
    const {user} = useAuth();
    const {openChat} = useChat();
    const location = useLocation();
    const {
        notifications,
        unreadCount,
        isDropdownOpen,
        toggleDropdown,
        closeDropdown,
        markAsRead,
        markAllAsRead,
        handleNotificationClick,
    } = useNotifications();
    const notificationRef = useRef(null);

    // Track previous path for chat background
    useEffect(() => {
        if (location.pathname !== '/chat' && !location.pathname.startsWith('/chat/')) {
            sessionStorage.setItem('previousPath', location.pathname);
        }
    }, [location.pathname]);

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                closeDropdown();
            }
        };

        if (isDropdownOpen) {
            // Use setTimeout to ensure the event listener is added after the current click event
            const timeoutId = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 0);

            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [isDropdownOpen, closeDropdown]);

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

                        {/* Notification Bell */}
                        {user && (
                            <div className="nav__notification-wrapper" ref={notificationRef}>
                                <button
                                    onClick={toggleDropdown}
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
                                        position: "relative",
                                    }}
                                    aria-label="Notifications"
                                >
                                    <Bell style={{fontSize: "20px", width: "20px", height: "20px"}}/>
                                    {unreadCount > 0 && (
                                        <span
                                            style={{
                                                position: "absolute",
                                                top: "-2px",
                                                right: "-2px",
                                                backgroundColor: "#ef4444",
                                                color: "white",
                                                borderRadius: "50%",
                                                width: "20px",
                                                height: "20px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                border: "2px solid #56018D",
                                                minWidth: "20px",
                                            }}
                                        >
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notification Panel */}
                                {isDropdownOpen && (
                                    <NotificationPanel
                                        notifications={notifications}
                                        onMarkAsRead={markAsRead}
                                        onMarkAllAsRead={markAllAsRead}
                                        onNotificationClick={handleNotificationClick}
                                        onClose={closeDropdown}
                                    />
                                )}
                            </div>
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
