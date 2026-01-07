// Auth context for Firebase Authentication (Google + Microsoft)
import React, { createContext, useContext, useEffect, useState } from "react";
import {
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    signOut,
    User,
} from "firebase/auth";

type Role = "admin" | "dev" | "viewer";

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: Role;
}

// Contexts
const AuthContext = createContext<AuthUser | null>(null);
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const auth = getAuth();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                const tokenResult = await fbUser.getIdTokenResult();
                const role = (tokenResult.claims.role as Role) ?? "viewer";
                setUser({
                    uid: fbUser.uid,
                    email: fbUser.email,
                    displayName: fbUser.displayName,
                    role,
                });
            } else {
                setUser(null);
            }
        });
        return () => unsub();
    }, [auth]);

    return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
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
