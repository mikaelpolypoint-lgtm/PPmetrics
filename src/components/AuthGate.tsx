import React from 'react';
import { useAuth } from '../lib/auth';
import Login from '../pages/Login';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const user = useAuth();

    // If not authenticated, show the login page
    if (!user) {
        return <Login />;
    }

    // Authenticated – render protected children
    return <>{children}</>;
};

export default AuthGate;
