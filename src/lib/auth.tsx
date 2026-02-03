// Auth context for Firebase Authentication (Google + Microsoft)
import React, { createContext, useContext, useEffect, useState } from "react";
import {
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    signOut,
} from "firebase/auth";

type Role = "admin" | "agile" | "developer" | "viewer";

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: Role;
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

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                // Fetch role from Firestore
                let role: Role = "developer"; // Default role if not found

                try {
                    const userDocRef = doc(db, "users", fbUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.role) {
                            role = data.role as Role;
                        }
                    } else {
                        // Optional: Create user doc if it doesn't exist? 
                        // For now, we assume admin creates users or we default to developer/viewer
                        // Let's default to a safe 'viewer' equivalent, which is 'developer' with limited access?
                        // Actually, 'developer' has write access to availabilities. 
                        // Maybe we need a 'viewer' role that sees nothing?
                        // The user didn't specify 'viewer'. Let's stick to 'developer' as base strictly, 
                        // or maybe 'agile' is safer for 'read everything'?
                        // No, 'developer' is most restrictive (only 2 pages).
                    }
                } catch (e) {
                    console.error("Error fetching user role:", e);
                }

                setUser({
                    uid: fbUser.uid,
                    email: fbUser.email,
                    displayName: fbUser.displayName,
                    role,
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
