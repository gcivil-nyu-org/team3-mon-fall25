import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock the AuthContext BEFORE importing ProtectedRoute
vi.mock('../contexts/AuthContext', async () => {
    const actual = await vi.importActual('../contexts/AuthContext');
    return {
        ...actual,
        useAuth: vi.fn(),
    };
});

// Import after mocking
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

// Helper components for testing
const TestContent = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;

// Helper to render with router and the ProtectedRoute using children pattern
const renderWithRouter = (initialEntries = ['/']) => {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <Routes>
                {/* Protected route with children */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <TestContent />
                        </ProtectedRoute>
                    }
                />

                {/* Public login route */}
                <Route path="/login" element={<LoginPage />} />
            </Routes>
        </MemoryRouter>
    );
};

describe('ProtectedRoute', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
    });

    describe('Loading State', () => {
        it('displays loading message when isLoading is true', () => {
            useAuth.mockReturnValue({
                isAuthenticated: false,
                isLoading: true,
            });

            renderWithRouter();

            expect(screen.getByText('Loading...')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
        });

        it('displays loading state with correct structure', () => {
            useAuth.mockReturnValue({
                isAuthenticated: false,
                isLoading: true,
            });

            renderWithRouter();

            const loadingText = screen.getByText('Loading...');
            expect(loadingText).toBeInTheDocument();
            // Verify the loading div has a parent container
            expect(loadingText.parentElement).toBeInTheDocument();
        });
    });

    describe('Authentication Check', () => {
        it('redirects to login page when user is not authenticated', () => {
            useAuth.mockReturnValue({
                isAuthenticated: false,
                isLoading: false,
            });

            renderWithRouter();

            expect(screen.getByText('Login Page')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });
    });

    describe('Component Behavior', () => {

        it('does not render children when not authenticated', () => {
            useAuth.mockReturnValue({
                isAuthenticated: false,
                isLoading: false,
            });

            renderWithRouter();

            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.getByText('Login Page')).toBeInTheDocument();
        });
    });

    describe('State Transitions', () => {
        it('redirects when loading completes for unauthenticated users', () => {
            // When not loading and not authenticated, should redirect
            useAuth.mockReturnValue({
                isAuthenticated: false,
                isLoading: false,
            });

            renderWithRouter();

            expect(screen.getByText('Login Page')).toBeInTheDocument();
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('renders children when user is authenticated', () => {
            // Mock isAuthenticated as a boolean
            useAuth.mockReturnValue({
                isAuthenticated: true,
                isLoading: false,
            });

            renderWithRouter();

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
        });
    });
});
