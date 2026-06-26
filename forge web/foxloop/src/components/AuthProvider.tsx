"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { setAuthTokenGetter } from "@/lib/auth-token";
import { loginInvited, recordLogin } from "@/lib/game-api";
import type { AppUser, AuthProviderType } from "@/lib/auth-types";

export type { AppUser, AuthProviderType };

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithInvited: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const INVITED_TOKEN_KEY = "foxloop_invited_token";
const INVITED_USER_KEY = "foxloop_invited_user";

function fromFirebaseUser(user: FirebaseUser): AppUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    provider: "google",
  };
}

function clearInvitedSession(): void {
  sessionStorage.removeItem(INVITED_TOKEN_KEY);
  sessionStorage.removeItem(INVITED_USER_KEY);
}

function readInvitedSession(): { user: AppUser; token: string } | null {
  try {
    const token = sessionStorage.getItem(INVITED_TOKEN_KEY);
    const raw = sessionStorage.getItem(INVITED_USER_KEY);
    if (!token || !raw) return null;
    const user = JSON.parse(raw) as AppUser;
    if (user.provider !== "invited") return null;
    return { user, token };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [invitedToken, setInvitedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      return auth.currentUser.getIdToken();
    }
    return invitedToken;
  }, [invitedToken]);

  useEffect(() => {
    setAuthTokenGetter(getIdToken);
  }, [getIdToken]);

  useEffect(() => {
    const invited = readInvitedSession();
    if (invited) {
      setInvitedToken(invited.token);
      setUser(invited.user);
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        clearInvitedSession();
        setInvitedToken(null);
        setUser(fromFirebaseUser(firebaseUser));
      } else if (!readInvitedSession()) {
        setUser(null);
        setInvitedToken(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    clearInvitedSession();
    setInvitedToken(null);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    await recordLogin();
  }, []);

  const signInWithInvited = useCallback(async (username: string, password: string) => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }

    const result = await loginInvited(username, password);
    sessionStorage.setItem(INVITED_TOKEN_KEY, result.token);
    sessionStorage.setItem(INVITED_USER_KEY, JSON.stringify(result.user));
    setInvitedToken(result.token);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    clearInvitedSession();
    setInvitedToken(null);
    setUser(null);
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signInWithInvited,
      signOut,
      getIdToken,
    }),
    [user, loading, signInWithGoogle, signInWithInvited, signOut, getIdToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
