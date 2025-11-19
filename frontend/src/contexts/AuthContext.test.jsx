import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { jwtDecode } from 'jwt-decode';

// Mock jwt-decode
vi.mock('jwt-decode');

// Helper component to test the hook
const TestComponent = () => {
    const { user, token, login, logout, isAuthenticated, isLoading } = useAuth();

    return (
        <div>
            <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
            <div data-testid="token">{token || 'null'}</div>
            <div data-testid="isAuthenticated">{isAuthenticated().toString()}</div>
            <div data-testid="isLoading">{isLoading.toString()}</div>
            <button onClick={() => login('access123', 'refresh123', { id: 1, email: 'test@nyu.edu' })}>
                Login
            </button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('useAuth hook', () => {
        it('throws error when used outside AuthProvider', () => {
            // Suppress console.error for this test
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestComponent />);
            }).toThrow('useAuth must be used within an AuthProvider');

            consoleSpy.mockRestore();
        });
    });

    describe('AuthProvider - Initial State', () => {
        it('initializes with null user and token when localStorage is empty', async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('user')).toHaveTextContent('null');
            expect(screen.getByTestId('token')).toHaveTextContent('null');
            expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        });

        it('initializes with valid token from localStorage', async () => {
            const mockToken = 'valid_token';
            const mockUser = { id: 1, email: 'test@nyu.edu' };
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour

            // Set values in localStorage before rendering
            jwtDecode.mockReturnValue(mockDecoded);
            localStorage.setItem('access_token', mockToken);
            localStorage.setItem('user', JSON.stringify(mockUser));

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
            });
            expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
            expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
        });

        it('clears expired token from localStorage on mount', async () => {
            const mockToken = 'expired_token';
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) - 3600 }; // Expired 1 hour ago

            localStorage.setItem('access_token', mockToken);
            localStorage.setItem('refresh_token', 'refresh_token');
            localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@nyu.edu' }));
            jwtDecode.mockReturnValue(mockDecoded);

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            expect(localStorage.getItem('access_token')).toBeNull();
            expect(localStorage.getItem('refresh_token')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
            expect(screen.getByTestId('user')).toHaveTextContent('null');
            expect(screen.getByTestId('token')).toHaveTextContent('null');
        });

        it('handles invalid token format gracefully', async () => {
            const mockToken = 'invalid_token';
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            jwtDecode.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            localStorage.setItem('access_token', mockToken);

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            expect(screen.getByTestId('user')).toHaveTextContent('null');
            expect(screen.getByTestId('token')).toHaveTextContent('null');

            consoleSpy.mockRestore();
        });
    });

    describe('login function', () => {
        it('stores tokens and user data in localStorage', async () => {
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) + 3600 };
            jwtDecode.mockReturnValue(mockDecoded);

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            const loginButton = screen.getByText('Login');
            await act(async () => {
                loginButton.click();
            });

            await waitFor(() => {
                expect(localStorage.getItem('access_token')).toBe('access123');
                expect(localStorage.getItem('refresh_token')).toBe('refresh123');
                expect(localStorage.getItem('user')).toBe(
                    JSON.stringify({ id: 1, email: 'test@nyu.edu' })
                );
            });

            expect(screen.getByTestId('token')).toHaveTextContent('access123');
            expect(screen.getByTestId('user')).toHaveTextContent(
                JSON.stringify({ id: 1, email: 'test@nyu.edu' })
            );
        });

        it('updates authentication state after login', async () => {
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) + 3600 };
            jwtDecode.mockReturnValue(mockDecoded);

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

            const loginButton = screen.getByText('Login');
            await act(async () => {
                loginButton.click();
            });

            await waitFor(() => {
                expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
            });
        });
    });

    describe('logout function', () => {
        it('clears tokens and user data from localStorage', async () => {
            const mockToken = 'valid_token';
            const mockUser = { id: 1, email: 'test@nyu.edu' };
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) + 3600 };

            localStorage.setItem('access_token', mockToken);
            localStorage.setItem('user', JSON.stringify(mockUser));
            jwtDecode.mockReturnValue(mockDecoded);

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            const logoutButton = screen.getByText('Logout');
            await act(async () => {
                logoutButton.click();
            });

            await waitFor(() => {
                expect(localStorage.getItem('access_token')).toBeNull();
                expect(localStorage.getItem('refresh_token')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
            });

            expect(screen.getByTestId('user')).toHaveTextContent('null');
            expect(screen.getByTestId('token')).toHaveTextContent('null');
            expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        });
    });

    describe('isAuthenticated function', () => {
        it('returns true for valid non-expired token', async () => {
            const mockToken = 'valid_token';
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour

            jwtDecode.mockReturnValue(mockDecoded);
            localStorage.setItem('access_token', mockToken);

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            await waitFor(() => {
                expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
            });
        });

        it('returns false for expired token', async () => {
            const mockToken = 'expired_token';
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) - 3600 }; // Expired 1 hour ago

            localStorage.setItem('access_token', mockToken);
            jwtDecode.mockReturnValue(mockDecoded);

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        });

        it('returns false when no token exists', async () => {
            jwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        });

        it('returns false for invalid token format', async () => {
            const mockToken = 'invalid_token';
            localStorage.setItem('access_token', mockToken);
            jwtDecode.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

            consoleSpy.mockRestore();
        });
    });

    describe('Loading State', () => {
        it('sets isLoading to false after initialization', async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
            });
        });
    });
});

