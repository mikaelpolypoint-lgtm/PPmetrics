import React from "react";
import { signInWithMicrosoft } from "../lib/auth";

const Login: React.FC = () => {
    return (
        <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
            <div className="card max-w-sm w-full p-8 animate-in fade-in zoom-in duration-300">
                <h1 className="text-2xl font-bold text-center mb-6">PPMetrics</h1>
                <button
                    onClick={signInWithMicrosoft}
                    className="btn btn-primary w-full"
                >
                    Sign in with SSO (Microsoft)
                </button>
            </div>
        </div>
    );
};

export default Login;
