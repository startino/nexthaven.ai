import { supabase } from "./supabase";
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Get the current session
   */
  async getSession(): Promise<Session | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
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
