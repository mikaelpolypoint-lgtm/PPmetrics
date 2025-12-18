import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const auth = localStorage.getItem('metrics_auth');
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputCode === 'thisiswip') {
            localStorage.setItem('metrics_auth', 'true');
            setIsAuthenticated(true);
            setError(false);
        } else {
            setError(true);
            setInputCode('');
        }
    };

    if (isLoading) {
        return null; // Or a loading spinner
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
                <div className="card max-w-sm w-full p-8 animate-in fade-in zoom-in duration-300">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-4">
                            <Lock size={24} />
                        </div>
                        <h1 className="text-xl font-bold text-brand-primary">Protected Area</h1>
                        <p className="text-text-muted text-sm mt-1">Please enter the access code.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={inputCode}
                                onChange={(e) => {
                                    setInputCode(e.target.value);
                                    setError(false);
                                }}
                                className={`input w-full ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                                placeholder="Access Code"
                                autoFocus
                            />
                            {error && (
                                <p className="text-red-500 text-xs mt-1 ml-1">Incorrect code. Please try again.</p>
                            )}
                        </div>
                        <button type="submit" className="btn btn-primary w-full">
                            Enter
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthGate;
