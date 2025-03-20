import { supabase } from "./supabase";
import { stripeService } from "./stripe";
import type {
  Session,
  User,
  AuthError,
  AuthChangeEvent,
} from "@supabase/supabase-js";

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export const auth = {
  /**
   * Get the current user
   */
  async getUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        return null;
      }

      return user;
    } catch (e) {
      console.error("Exception getting user:", e);
      return null;
    }
  },

  /**
   * Get the current session
   */
  async getSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        return null;
      }

      return session;
    } catch (e) {
      console.error("Exception getting session:", e);
      return null;
    }
  },

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    const {
      data: { user, session },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
    });

    // If sign up was successful and we have a user, create a Stripe customer
    if (!error && user) {
      try {
        // We need to wait for the session to be established before creating a customer
        // This ensures the auth token is available for the function call
        if (session) {
          console.log("Creating Stripe customer for new user:", user.id);
          const customerId = await stripeService.createCustomer();
          console.log("Stripe customer created:", customerId);
        } else {
          console.warn(
            "Session not available, will create customer on first login"
          );
        }
      } catch (stripeError) {
        console.error("Error creating Stripe customer:", stripeError);
        // We don't want to fail the sign up if Stripe customer creation fails
        // The customer can be created later
      }
    }

    return { user, session, error };
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const {
      data: { user, session },
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If sign in was successful, try to create a Stripe customer if they don't have one
    if (!error && user && session) {
      try {
        console.log("Checking/creating Stripe customer on sign in");
        await stripeService.createCustomer();
      } catch (stripeError) {
        console.error("Error checking/creating Stripe customer:", stripeError);
      }
    }

    return { user, session, error };
  },

  /**
   * Sign in with magic link (passwordless)
   */
  async signInWithMagicLink(
    email: string
  ): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    return { error };
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Set up auth state change listener
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  },

  /**
   * Update password with reset token
   */
  async updatePassword(
    password: string
  ): Promise<{ user: User | null; error: AuthError | null }> {
    const {
      data: { user },
      error,
    } = await supabase.auth.updateUser({
      password,
    });

    return { user, error };
  },
};
