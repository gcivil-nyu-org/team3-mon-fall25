import React from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';

const ProtectedRoute = ({children}) => {
    const {isAuthenticated, isLoading} = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    background: '#56018D',
                    color: 'white',
                    fontSize: '18px',
                }}
            >
                Loading...
            </div>
        );
    }
    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                state={{from: location}}
                replace
            />
        );
    }

    return children;
};
export default ProtectedRoute;


