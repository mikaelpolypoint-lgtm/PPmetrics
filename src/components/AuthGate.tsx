import React from 'react';

// AuthGate removed - render children directly
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};

export default AuthGate;
