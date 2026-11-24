"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SIGNED_OUT, type AuthState } from "@/lib/auth/types";

const AuthContext = createContext<AuthState>(SIGNED_OUT);

/** Makes the server-provided auth state (who is signed in, if accounts are enabled) available to client components. */
export function AuthProvider({ value, children }: { value: AuthState; children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
