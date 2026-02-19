// Auth context for Firebase Authentication (Google + Microsoft)
import React, { createContext, useContext, useEffect, useState } from "react";
import {
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from "firebase/auth";

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
}

// Contexts
interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx.user; // For backward compatibility with existing code expecting just user
};

export const useAuthFull = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                setUser({
                    uid: fbUser.uid,
                    email: fbUser.email,
                    displayName: fbUser.displayName,
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [auth]);

    return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

// Helper sign‑in functions
export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getAuth(), provider);
};

export const signInWithMicrosoft = async () => {
    const provider = new OAuthProvider("microsoft.com");
    // Add scopes if needed, e.g. provider.addScope("User.Read");
    await signInWithPopup(getAuth(), provider);
};

export const signOutUser = async () => {
    await signOut(getAuth());
};

export const signInWithEmail = async (email: string, pass: string) => {
    return await signInWithEmailAndPassword(getAuth(), email, pass);
};

export const signUpWithEmail = async (email: string, pass: string) => {
    return await createUserWithEmailAndPassword(getAuth(), email, pass);
};
