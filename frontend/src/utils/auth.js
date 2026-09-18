// Session token helpers. The token is issued by POST /api/auth/login and
// stored in localStorage so a page refresh keeps you signed in.
const TOKEN_KEY = 'upiguard_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode) — session just won't persist
  }
}

export function clearToken() {
  setToken(null);
}

export function isSignedIn() {
  return Boolean(getToken());
}