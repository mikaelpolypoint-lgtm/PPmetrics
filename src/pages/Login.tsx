import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthFull, signInWithEmail, signUpWithEmail } from '../lib/auth';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
    const { user, loading } = useAuthFull();
    const navigate = useNavigate();
    const location = useLocation();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const from = (location.state as any)?.from?.pathname || '/';

    useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (isLogin) {
                await signInWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password);
            }
        } catch (err: any) {
            console.error(err);
            let msg = `Authentication failed (${err.code})`;
            if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
            if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
            if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
            if (err.code === 'auth/operation-not-allowed') msg = "Email/Password login is not enabled in Firebase Console.";
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-bg-main">
            <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-brand-primary mb-2">Scrum Metrics</h1>
                    <p className="text-gray-500">
                        {isLogin ? "Sign in to access your dashboard" : "Create a new account"}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all"
                            placeholder="name@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {isSubmitting ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                                {isLogin ? "Sign In" : "Create Account"}
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-brand-primary hover:underline font-medium"
                    >
                        {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>

                {!isLogin && (
                    <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg text-center">
                        New accounts default to <strong>Developer</strong> role.
                        <br />Contact an admin for role promotion.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
