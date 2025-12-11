import React, { createContext, useContext } from "react";
import {
  SessionManager,
  SessionManagerConfig,
  SessionUser,
} from "./session-manager";
import { useEveryAppSession } from "./_internal/useEveryAppSession";
import { useEveryAppRouter } from "./_internal/useEveryAppRouter";

interface EmbeddedProviderConfig extends SessionManagerConfig {
  children: React.ReactNode;
}

interface EmbeddedAppContextValue {
  sessionManager: SessionManager;
  isAuthenticated: boolean;
  sessionTokenState: ReturnType<SessionManager["getTokenState"]>;
  user: SessionUser | null;
}

const EmbeddedAppContext = createContext<EmbeddedAppContextValue | null>(null);

export function EmbeddedAppProvider({
  children,
  ...config
}: EmbeddedProviderConfig) {
  const { sessionManager, sessionTokenState } = useEveryAppSession({
    sessionManagerConfig: config,
  });
  useEveryAppRouter({ sessionManager });

  if (!sessionManager) return null;

  const value: EmbeddedAppContextValue = {
    sessionManager,
    isAuthenticated: sessionTokenState.status === "VALID",
    sessionTokenState,
    user: sessionManager.getUser(),
  };

  return (
    <EmbeddedAppContext.Provider value={value}>
      {children}
    </EmbeddedAppContext.Provider>
  );
}

/**
 * Hook to access the current user's info (userId and email) from the session token.
 * Returns null if not authenticated.
 */
export function useCurrentUser(): SessionUser | null {
  const context = useContext(EmbeddedAppContext);
  if (!context) {
    throw new Error(
      "useCurrentUser must be used within an EmbeddedAppProvider",
    );
  }
  return context.user;
}
