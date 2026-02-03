import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthFull } from '../lib/auth';

interface RoleGuardProps {
    allowedRoles: string[];
    children: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
    const { user, loading } = useAuthFull();
    const location = useLocation();

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Checking permissions...</div>;
    }

    if (!user) {
        // Not logged in, redirect to login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        // Role not allowed
        // If developer tries to access denied page -> redirect to their home (Capacity Availabilities?)
        // If others -> redirect to dashboard

        const fallback = user.role === 'developer' ? `/${location.pathname.split('/')[1] || 'current'}/capacity-availabilities` : '/';

        console.warn(`User ${user.email} (${user.role}) denied access to ${location.pathname}. Redirecting to ${fallback}`);
        return <Navigate to={fallback} replace />;
    }

    return <>{children}</>;
};

export default RoleGuard;
