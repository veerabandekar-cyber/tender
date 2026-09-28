/**
 * Authentication Context for SalesConnect
 * Provides auth state and methods throughout the app.
 * Password-based authentication with security questions for password recovery.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  isAuthenticated as checkAuth,
  StoredUser,
  getAuthHeaders,
} from "@/lib/auth";

// API Base URL Detection
const getApiBaseUrl = () => {
  const { hostname, port } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal) {
    if (port === "8000") return "";
    return "http://127.0.0.1:8000";
  }
  return import.meta.env.VITE_API_URL || "https://asttc-sales.meetlive.in";
};

const API_BASE_URL = getApiBaseUrl();
const API_PREFIX = "/api/v1";

// ============== Types ==============

interface AuthContextType {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (data: SignupData) => Promise<AuthResult>;
  logout: () => void;
  forgotPasswordVerify: (email: string) => Promise<ForgotPasswordVerifyResult>;
  forgotPasswordReset: (data: ForgotPasswordResetData) => Promise<SimpleResult>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<SimpleResult>;
  refreshUser: () => Promise<void>;
  getSecurityQuestions: () => Promise<string[]>;
  requestOTP: (email: string) => Promise<SimpleResult>;
  verifyOTP: (email: string, otp: string) => Promise<OTPVerifyResult>;
}

interface OTPVerifyResult {
  success: boolean;
  message: string;
  verification_token?: string;
}

interface AuthResult {
  success: boolean;
  message: string;
  user?: StoredUser;
}

interface SimpleResult {
  success: boolean;
  message: string;
}

interface ForgotPasswordVerifyResult {
  success: boolean;
  message: string;
  email?: string;
  security_question_1?: string;
  security_question_2?: string;
}

interface SignupData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  security_question_1: string;
  security_answer_1: string;
  security_question_2: string;
  security_answer_2: string;
  verification_token: string;
}

interface ForgotPasswordResetData {
  email: string;
  security_answer_1: string;
  security_answer_2: string;
  new_password: string;
}

// ============== Context ==============

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============== Provider ==============

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      if (checkAuth()) {
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        } else {
          // Token exists but no user - fetch from API
          try {
            await refreshUser();
          } catch {
            // Token invalid, clear it
            removeToken();
            removeStoredUser();
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Get security questions list
  const getSecurityQuestions = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_PREFIX}/auth/security-questions`,
      );
      const data = await response.json();
      return data.questions || [];
    } catch (error) {
      console.error("Failed to fetch security questions:", error);
      return [];
    }
  }, []);

  // Login with email and password
  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}${API_PREFIX}/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: data.detail || "Invalid email or password",
          };
        }

        // Store token and user
        if (data.access_token) {
          setToken(data.access_token);
        }
        if (data.user) {
          setStoredUser(data.user);
          setUser(data.user);
        }

        return {
          success: true,
          message: data.message || "Login successful",
          user: data.user,
        };
      } catch (error) {
        console.error("Login request failed:", error);
        return { success: false, message: "Unable to reach the portal server. Please ensure the backend is running." };
      }
    },
    [],
  );

  // Signup with all user details
  const signup = useCallback(
    async (signupData: SignupData): Promise<AuthResult> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}${API_PREFIX}/auth/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(signupData),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: data.detail || "Failed to create account",
          };
        }

        // Store token and user
        if (data.access_token) {
          setToken(data.access_token);
        }
        if (data.user) {
          setStoredUser(data.user);
          setUser(data.user);
        }

        return {
          success: true,
          message: data.message || "Account created successfully",
          user: data.user,
        };
      } catch (error) {
        console.error("Signup error:", error);
        return { success: false, message: "Unable to reach the portal server. Please ensure the backend is running." };
      }
    },
    [],
  );

  // Request an OTP code
  const requestOTP = useCallback(async (email: string): Promise<SimpleResult> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_PREFIX}/auth/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.detail || "Failed to send verification code",
        };
      }

      return {
        success: true,
        message: data.message || "Verification code sent",
      };
    } catch (error) {
      console.error("Request OTP error:", error);
      return { success: false, message: "Unable to reach the portal server. Please ensure the backend is running." };
    }
  }, []);

  // Verify an OTP code
  const verifyOTP = useCallback(
    async (email: string, otp: string): Promise<OTPVerifyResult> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}${API_PREFIX}/auth/verify-otp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: data.detail || "Invalid verification code",
          };
        }

        return {
          success: true,
          message: data.message || "Email verified",
          verification_token: data.verification_token,
        };
      } catch (error) {
        console.error("Verify OTP error:", error);
        return { success: false, message: "Unable to reach the portal server. Please ensure the backend is running." };
      }
    },
    [],
  );

  // Logout - clear everything
  const logout = useCallback(() => {
    removeToken();
    removeStoredUser();
    setUser(null);
  }, []);

  // Forgot password - verify email and get security questions
  const forgotPasswordVerify = useCallback(
    async (email: string): Promise<ForgotPasswordVerifyResult> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}${API_PREFIX}/auth/forgot-password/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: data.detail || "Email not found",
          };
        }

        return {
          success: true,
          message: "Security questions retrieved",
          email: data.email,
          security_question_1: data.security_question_1,
          security_question_2: data.security_question_2,
        };
      } catch (error) {
        console.error("Forgot password verify error:", error);
        return { success: false, message: "Unable to reach the portal server. Please ensure the backend is running." };
      }
    },
    [],
  );

  // Forgot password - reset with security answers
  const forgotPasswordReset = useCallback(
    async (resetData: ForgotPasswordResetData): Promise<SimpleResult> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}${API_PREFIX}/auth/forgot-password/reset`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resetData),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: data.detail || "Failed to reset password",
          };
        }

        return {
          success: true,
          message: data.message || "Password reset successfully",
        };
      } catch (error) {
        console.error("Forgot password reset error:", error);
        return { success: false, message: "Unable to reach the portal server. Please ensure the backend is running." };
      }
    },
    [],
  );

  // Change password for logged in user
  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<SimpleResult> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}${API_PREFIX}/auth/change-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              current_password: currentPassword,
              new_password: newPassword,
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: data.detail || "Failed to change password",
          };
        }

        return {
          success: true,
          message: data.message || "Password changed successfully",
        };
      } catch (error) {
        console.error("Change password error:", error);
        return { success: false, message: "Unable to reach the portal server. Please ensure the backend is running." };
      }
    },
    [],
  );

  // Refresh user data from API
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/me`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      const userData: StoredUser = await response.json();
      setStoredUser(userData);
      setUser(userData);
    } catch (error) {
      console.error("Unable to refresh authenticated user:", error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && checkAuth(),
    isLoading,
    login,
    signup,
    logout,
    forgotPasswordVerify,
    forgotPasswordReset,
    changePassword,
    refreshUser,
    getSecurityQuestions,
    requestOTP,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============== Hook ==============

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Export the context for advanced use cases
export { AuthContext };
