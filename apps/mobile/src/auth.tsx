import type { User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { configError, supabase } from "./supabase";
import { RECOVERY_STORAGE_KEY, isMissingOrInvalidSession, parseRecoveryContext, recoveryBlocksApp, serializeRecoveryContext, type RecoveryContext } from "./auth-flow";
import { authEvent, beginIdentityCheck, beginPasswordSignIn, finishIdentityCheck, initialAuthState, passwordSignInSucceeded } from "./auth-state";

type AuthState = {
  user: User | null;
  loading: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
  recovery: RecoveryContext | null;
  recoveryRequired: boolean;
  setRecovery: (context: RecoveryContext | null) => Promise<void>;
  authError: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(() => configError ? { status: "unauthenticated" as const, user: null as User | null, generation: 0 } : initialAuthState<User>());
  const generation = useRef(0);
  const checkingIdentity = useRef(false);
  const passwordSignInPending = useRef(false);
  const recoveryVersion = useRef(0);
  const [recovery, setRecoveryState] = useState<RecoveryContext | null>(null);
  const [recoveryLoaded, setRecoveryLoaded] = useState(false);
  const [recoveryLoadError, setRecoveryLoadError] = useState(false);

  const checkIdentity = useCallback(() => {
    if (!supabase) return;
    const request = ++generation.current;
    checkingIdentity.current = true;
    setAuth((state) => beginIdentityCheck(state, request));
    supabase.auth.getUser().then(({ data, error }) => {
      if (generation.current === request) checkingIdentity.current = false;
      setAuth((state) => finishIdentityCheck(state, request, data.user, !!error && !isMissingOrInvalidSession(error)));
    }).catch(() => {
      if (generation.current === request) checkingIdentity.current = false;
      setAuth((state) => finishIdentityCheck(state, request, null, true));
    });
  }, []);

  const loadRecovery = useCallback(() => {
    const version = recoveryVersion.current;
    setRecoveryLoadError(false);
    AsyncStorage.getItem(RECOVERY_STORAGE_KEY).then((stored) => {
      if (recoveryVersion.current === version) setRecoveryState(parseRecoveryContext(stored));
      setRecoveryLoaded(true);
    }).catch(() => { setRecoveryLoadError(true); setRecoveryLoaded(true); });
  }, []);

  const setRecovery = useCallback(async (context: RecoveryContext | null) => {
    ++recoveryVersion.current;
    if (!context) setRecoveryState(null);
    if (context) await AsyncStorage.setItem(RECOVERY_STORAGE_KEY, serializeRecoveryContext(context));
    else await AsyncStorage.removeItem(RECOVERY_STORAGE_KEY);
    if (context) setRecoveryState(context);
  }, []);

  useEffect(() => {
    loadRecovery();
    if (!supabase) return;
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (__DEV__) console.debug("[AUTH] event", { event: _event, user: !!session?.user });
      if (!active || _event === "INITIAL_SESSION") return;
      if (_event === "SIGNED_OUT") {
        // Clear the in-memory gate in the same event as the user. Storage cleanup
        // must not determine which screen becomes available after sign-out.
        void setRecovery(null).catch(() => { if (__DEV__) console.warn("[AUTH] recovery storage cleanup failed"); });
      }
      // signInWithPassword has an explicit result; its generic SIGNED_IN event
      // must not race recovery cleanup or a pending startup identity check.
      if (passwordSignInPending.current && session?.user) return;
      if (session?.user && checkingIdentity.current) {
        // A restored local session can emit SIGNED_IN. Verify it before opening routes.
        checkIdentity();
        return;
      }
      checkingIdentity.current = false;
      const next = ++generation.current;
      setAuth((state) => authEvent(state, _event, session?.user ?? null, next));
    });
    checkIdentity();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [checkIdentity, loadRecovery, setRecovery]);

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    passwordSignInPending.current = true;
    checkingIdentity.current = false;
    const started = ++generation.current;
    setAuth((state) => beginPasswordSignIn(state, started));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user || !data.session) throw error ?? new Error("Sign-in did not return a session.");
      if (__DEV__) console.debug("[AUTH] signIn success", { user: !!data.user, session: !!data.session });
      // This known password sign-in supersedes abandoned recovery intent.
      // Clear memory synchronously, but do not delay authenticated state for I/O.
      void setRecovery(null).catch(() => { if (__DEV__) console.warn("[AUTH] recovery storage cleanup failed"); });
      checkingIdentity.current = false;
      const next = ++generation.current;
      setAuth((state) => passwordSignInSucceeded(state, data.user, next));
    } finally { passwordSignInPending.current = false; }
  }

  async function signOut() {
    if (!supabase) return;
    if (__DEV__) console.debug("[AUTH] signOut pressed");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    const cleanup = setRecovery(null);
    if (__DEV__) console.debug("[AUTH] recovery state cleared");
    const next = ++generation.current;
    setAuth((state) => authEvent(state, "SIGNED_OUT", null, next));
    await cleanup;
  }

  const user = auth.status === "authenticated" ? auth.user : null;
  const loading = auth.status === "loading" || !recoveryLoaded;
  const authError = auth.status === "error" || recoveryLoadError;
  const recoveryRequired = recoveryBlocksApp(user, recovery);
  useEffect(() => {
    if (__DEV__) console.debug("[AUTH] provider", { user: !!user, loading, authError, recoveryRequired, generation: auth.generation });
  }, [user, loading, authError, recoveryRequired, auth.generation]);
  const retry = () => { if (recoveryLoadError) { setRecoveryLoaded(false); loadRecovery(); } if (auth.status === "error") checkIdentity(); };
  return <AuthContext.Provider value={{ user, loading, configError, signIn, signOut, retry, recovery, recoveryRequired, setRecovery, authError }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}
