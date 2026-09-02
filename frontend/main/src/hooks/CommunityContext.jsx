import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { communityMe } from '../api';

/**
 * CommunityContext — guest / logged-in user state for the Climb Pakistan
 * Community.
 *
 * The session is persisted in localStorage (matching the admin app's pattern):
 * - a signed JWT under `community-token`
 * - a cached copy of the user's public profile under `community-user`
 *
 * On app load the stored token is re-validated against GET /api/auth/me so the
 * session survives page refreshes. Guests are never blocked from browsing.
 */
const CommunityContext = createContext(null);

const TOKEN_KEY = 'climb-pakistan-community-token';
const USER_KEY = 'climb-pakistan-community-user';
const AUTH_PROMPT_KEY = 'climb-pakistan-community-auth-prompt';

function readUser() {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistSession(token, user) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore storage failures (private browsing, etc.)
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // ignore storage failures
  }
}

export function CommunityProvider({ children }) {
  // Init from localStorage synchronously so the first render already knows
  // whether the visitor is a guest or a returning user.
  const [user, setUser] = useState(readUser);
  const [token, setToken] = useState(readToken);
  // `initializing` is true only while we re-validate a stored session.
  const [initializing, setInitializing] = useState(true);
  // Message shown to a restricted (suspended) account: { status, reason } | null.
  const [restriction, setRestriction] = useState(null);
  // authPrompt is { open: boolean, reason: string | null }
  const [authPrompt, setAuthPrompt] = useState({ open: false, reason: null });

  // Validate the stored session on mount so refreshes keep the user logged in
  // (and stale/expired tokens are cleared).
  useEffect(() => {
    let active = true;

    async function validate() {
      const storedToken = readToken();
      if (!storedToken) {
        setUser(null);
        setRestriction(null);
        setInitializing(false);
        return;
      }
      try {
        const { user: fresh, restriction: freshRestriction } = await communityMe(storedToken);
        if (active) {
          // Banned users are signed out (they must see the login screen which
          // explains the ban). Suspended users stay logged in with a notice.
          if (freshRestriction?.status === 'banned') {
            setToken(null);
            setUser(null);
            setRestriction(null);
            clearSession();
          } else {
            setToken(storedToken);
            setUser(fresh);
            setRestriction(freshRestriction || null);
            persistSession(storedToken, fresh);
          }
        }
      } catch {
        if (active) {
          setToken(null);
          setUser(null);
          setRestriction(null);
          clearSession();
        }
      } finally {
        if (active) setInitializing(false);
      }
    }

    validate();
    return () => { active = false; };
  }, []);

  const isGuest = !user;

  const openAuthPrompt = useCallback((reason = null) => {
    setAuthPrompt({ open: true, reason });
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setAuthPrompt({ open: false, reason: null });
  }, []);

  const signIn = useCallback((nextToken, nextUser, nextRestriction = null) => {
    setToken(nextToken);
    setUser(nextUser);
    setRestriction(nextRestriction || null);
    persistSession(nextToken, nextUser);
    setAuthPrompt({ open: false, reason: null });
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setRestriction(null);
    clearSession();
  }, []);

  // Replace the cached user (e.g. after editing the profile) while keeping the
  // existing session token intact.
  const updateUser = useCallback((nextUser) => {
    setUser((prev) => {
      const merged = { ...prev, ...nextUser };
      const t = token || readToken();
      persistSession(t, merged);
      return merged;
    });
  }, [token]);

  const rememberPromptSeen = useCallback(() => {
    try {
      window.localStorage.setItem(AUTH_PROMPT_KEY, 'true');
    } catch {
      // ignore storage failures
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isGuest,
      initializing,
      restriction,
      signIn,
      signOut,
      updateUser,
      authPrompt,
      openAuthPrompt,
      closeAuthPrompt,
      rememberPromptSeen,
    }),
    [user, token, isGuest, initializing, restriction, signIn, signOut, updateUser, authPrompt, openAuthPrompt, closeAuthPrompt, rememberPromptSeen],
  );

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within a CommunityProvider');
  return ctx;
}