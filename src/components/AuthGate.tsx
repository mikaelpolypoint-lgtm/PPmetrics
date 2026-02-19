import React from 'react';
import { useAuthFull } from '../lib/auth';
import { Navigate, useLocation } from 'react-router-dom';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuthFull();
    const location = useLocation();

    // Allow access to login page without redirection loop
    if (location.pathname === '/login') {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default AuthGate;
