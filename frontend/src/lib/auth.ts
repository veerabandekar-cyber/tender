/**
 * Authentication utilities for SalesConnect
 * Handles token storage, API calls with auth, and session management.
 */

// Storage keys
const TOKEN_KEY = "tip_token";
const USER_KEY = "tip_user";

// ============== Token Management ==============

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  // Check if token is expired (decode JWT without verification)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() < exp;
  } catch {
    return false;
  }
}

// ============== User Management ==============

export interface StoredUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_photo_url?: string | null;
  location?: string | null;
  full_name?: string;
  initials?: string;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

// ============== Logout ==============

export function logout(): void {
  removeToken();
  removeStoredUser();
}

// ============== API Helpers ==============

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Check if an API response indicates auth failure
 */
export function isAuthError(status: number): boolean {
  return status === 401 || status === 403;
}
