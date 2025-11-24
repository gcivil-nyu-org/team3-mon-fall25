import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Mock the AuthContext
vi.mock('../contexts/AuthContext', async () => {
    const actual = await vi.importActual('../contexts/AuthContext');
    return {
        ...actual,
        useAuth: vi.fn(),
    };
});

// Import after mocking
import { useAuth } from '../contexts/AuthContext';

// Helper components for testing
const TestContent = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;

// Helper to render with router and the ProtectedRoute using Outlet pattern
const renderWithRouter = () => {
    return render(
        <BrowserRouter>
            <Routes>
                {/* Protected route wrapper */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<TestContent />} />
                </Route>

                {/* Public login route */}
                <Route path="/login" element={<LoginPage />} />
            </Routes>
        </BrowserRouter>
    );
};

describe('ProtectedRoute', () => {
    beforeEach(() => {
        // Reset mock implementation before each test
        useAuth.mockReset();
    });

    describe('Loading State', () => {
        it('displays loading message when isLoading is true', () => {
            useAuth.mockImplementation(() => ({
                isAuthenticated: false,
                isLoading: true,
            }));

            renderWithRouter();

            expect(screen.getByText('Loading...')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
        });

        it('displays loading state with correct structure', () => {
            useAuth.mockImplementation(() => ({
                isAuthenticated: false,
                isLoading: true,
            }));

            renderWithRouter();

            const loadingText = screen.getByText('Loading...');
            expect(loadingText).toBeInTheDocument();
            // Verify the loading div has a parent container
            expect(loadingText.parentElement).toBeInTheDocument();
        });
    });

    describe('Authentication Check', () => {
        // it('renders children when user is authenticated', () => {
        //     useAuth.mockImplementation(() => ({
        //         isAuthenticated: true,
        //         isLoading: false,
        //     }));
        //
        //     renderWithRouter();
        //
        //     expect(screen.getByText('Protected Content')).toBeInTheDocument();
        //     expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        //     expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
        // });

        it('redirects to login page when user is not authenticated', () => {
            useAuth.mockImplementation(() => ({
                isAuthenticated: false,
                isLoading: false,
            }));

            renderWithRouter();

            expect(screen.getByText('Login Page')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });
    });

    describe('Component Behavior', () => {

        it('does not render children when not authenticated', () => {
            useAuth.mockImplementation(() => ({
                isAuthenticated: false,
                isLoading: false,
            }));

            renderWithRouter();

            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.getByText('Login Page')).toBeInTheDocument();
        });
    });

    describe('State Transitions', () => {
        it('redirects when loading completes for unauthenticated users', () => {
            // When not loading and not authenticated, should redirect
            useAuth.mockImplementation(() => ({
                isAuthenticated: false,
                isLoading: false,
            }));

            renderWithRouter();

            expect(screen.getByText('Login Page')).toBeInTheDocument();
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });
});
