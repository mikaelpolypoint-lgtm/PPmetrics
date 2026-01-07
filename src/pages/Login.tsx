import React from "react";
import { signInWithGoogle, signInWithMicrosoft } from "../lib/auth";

const Login: React.FC = () => {
    return (
        <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
            <div className="card max-w-sm w-full p-8 animate-in fade-in zoom-in duration-300">
                <h1 className="text-2xl font-bold text-center mb-6">Sign in</h1>
                <button
                    onClick={signInWithGoogle}
                    className="btn btn-primary w-full mb-4"
                >
                    Sign in with Google
                </button>
                <button
                    onClick={signInWithMicrosoft}
                    className="btn btn-secondary w-full"
                >
                    Sign in with Microsoft
                </button>
            </div>
        </div>
    );
};

export default Login;
