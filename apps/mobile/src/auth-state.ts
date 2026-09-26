export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
export type AuthSnapshot<User> = { status: AuthStatus; user: User | null; generation: number };

export function initialAuthState<User>(): AuthSnapshot<User> {
  return { status: "loading", user: null, generation: 0 };
}

export function authEvent<User>(state: AuthSnapshot<User>, event: string, user: User | null, generation = state.generation + 1): AuthSnapshot<User> {
  if (event === "INITIAL_SESSION") return state;
  return { status: user ? "authenticated" : "unauthenticated", user, generation };
}

export function beginIdentityCheck<User>(state: AuthSnapshot<User>, generation = state.generation + 1): AuthSnapshot<User> {
  return { status: "loading", user: null, generation };
}

export function finishIdentityCheck<User>(state: AuthSnapshot<User>, generation: number, user: User | null, failed: boolean): AuthSnapshot<User> {
  if (state.generation !== generation) return state;
  if (failed) return { ...state, status: "error", user: null };
  return { ...state, status: user ? "authenticated" : "unauthenticated", user };
}

export function passwordSignInSucceeded<User>(state: AuthSnapshot<User>, user: User, generation = state.generation + 1): AuthSnapshot<User> {
  return { status: "authenticated", user, generation };
}

export function beginPasswordSignIn<User>(state: AuthSnapshot<User>, generation = state.generation + 1): AuthSnapshot<User> {
  return { ...state, generation };
}
