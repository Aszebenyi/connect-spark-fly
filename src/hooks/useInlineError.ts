import { useState, useCallback, useEffect } from "react";

interface UseInlineErrorOptions {
  autoDismissMs?: number;
}

export function useInlineError(options: UseInlineErrorOptions = {}) {
  const { autoDismissMs } = options;
  const [error, setErrorState] = useState<string | null>(null);

  const setError = useCallback((message: string | null) => {
    setErrorState(message);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  // Auto-dismiss if configured
  useEffect(() => {
    if (error && autoDismissMs) {
      const timer = setTimeout(() => {
        clearError();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [error, autoDismissMs, clearError]);

  return {
    error,
    setError,
    clearError,
    hasError: !!error,
  };
}

// Map common Supabase auth errors to user-friendly messages
export function mapAuthError(error: Error | string | null): string {
  if (!error) return "An unexpected error occurred.";
  
  const message = typeof error === "string" ? error : error.message;
  const lowerMessage = message.toLowerCase();

  // Login errors
  if (lowerMessage.includes("invalid login credentials")) {
    return "Email or password is incorrect. Please try again.";
  }
  if (lowerMessage.includes("email not confirmed")) {
    return "Please verify your email address first.";
  }
  if (lowerMessage.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  // Signup errors
  if (lowerMessage.includes("user already registered") || 
      lowerMessage.includes("already been registered")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (lowerMessage.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (lowerMessage.includes("signup is disabled")) {
    return "New registrations are currently disabled.";
  }

  // Rate limiting
  if (lowerMessage.includes("rate limit") || 
      lowerMessage.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Network errors
  if (lowerMessage.includes("fetch") || 
      lowerMessage.includes("network") ||
      lowerMessage.includes("connection")) {
    return "Connection failed. Please check your internet and try again.";
  }

  // Password reset errors
  if (lowerMessage.includes("expired") || 
      lowerMessage.includes("invalid token")) {
    return "This reset link has expired. Please request a new one.";
  }

  // Generic fallback
  return message || "Something went wrong. Please try again.";
}
