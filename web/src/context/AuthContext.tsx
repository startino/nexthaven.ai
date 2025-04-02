import React, {
  createContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { auth, AuthResponse } from "../services/auth";
import { supabase } from "../services/supabase";
import { stripeService } from "../services/stripe";

interface SubscriptionStatus {
  isActive: boolean;
  planId?: string;
  planName?: string;
  currentPeriodEnd?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  subscriptionLoading: boolean;
  subscription: SubscriptionStatus;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: null | Error }>;
  signInWithMagicLink: (email: string) => Promise<{ error: null | Error }>;
  refreshSubscription: () => Promise<void>;
  createCheckoutSession: (priceId: string) => Promise<string | null>;
  createCustomerPortalSession: () => Promise<string | null>;
  ensureStripeCustomer: () => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false,
  });

  // Add a ref to track if a subscription check is in progress
  const isCheckingSubscription = useRef(false);
  // Add a ref to track the last check time to avoid frequent calls
  const lastCheckTime = useRef(0);
  // Minimum time between checks in milliseconds (5 seconds)
  const MIN_CHECK_INTERVAL = 5000;

  // Store current user in a ref to access latest value in callbacks
  const userRef = useRef<User | null>(null);

  // Sync the ref with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Ensure the user has a Stripe customer
  const ensureStripeCustomer = useCallback(async (): Promise<string | null> => {
    // Use the ref to get the latest user value
    const currentUser = userRef.current;
    if (!currentUser) {
      console.warn(
        "AuthContext: Cannot ensure Stripe customer - no user logged in"
      );
      return null;
    }

    try {
      console.log(
        "AuthContext: Ensuring user has Stripe customer for",
        currentUser.id
      );
      return await stripeService.createCustomer();
    } catch (error) {
      console.error("AuthContext: Error ensuring Stripe customer:", error);
      return null;
    }
  }, []); // No dependencies needed as we use the ref

  const fetchSubscriptionStatus = useCallback(async () => {
    // If a check is already in progress or not enough time has passed, skip
    const now = Date.now();
    if (
      isCheckingSubscription.current ||
      now - lastCheckTime.current < MIN_CHECK_INTERVAL
    ) {
      console.log("AuthContext: Skipping duplicate subscription check");
      return;
    }

    // Use the ref to get the latest user value
    const currentUser = userRef.current;
    if (!currentUser) {
      console.log("AuthContext: No user, setting inactive subscription status");
      setSubscription({ isActive: false });
      return;
    }

    try {
      // Set the flag to prevent duplicate calls
      isCheckingSubscription.current = true;
      setSubscriptionLoading(true);
      lastCheckTime.current = now;

      console.log(
        "AuthContext: Fetching subscription status for user:",
        currentUser.id
      );

      // Ensure user has a Stripe customer before checking subscription
      await ensureStripeCustomer();

      const subscriptionStatus = await stripeService.getSubscriptionStatus();
      console.log(
        "AuthContext: Subscription status received:",
        subscriptionStatus
      );
      setSubscription(subscriptionStatus);
    } catch (error) {
      console.error("AuthContext: Error fetching subscription status:", error);
      // Set default inactive status on error to avoid blocking the UI
      setSubscription({ isActive: false });
    } finally {
      // Reset the flags when done
      isCheckingSubscription.current = false;
      setSubscriptionLoading(false);
    }
  }, [ensureStripeCustomer]); // Only depends on ensureStripeCustomer

  useEffect(() => {
    // Get initial session
    async function getInitialSession() {
      setLoading(true);
      console.log("AuthContext: Getting initial session...");

      try {
        // First try to get the session from supabase directly
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "AuthContext: Error getting session from supabase:",
            sessionError
          );
        }

        if (initialSession) {
          console.log(
            "AuthContext: Initial session found from supabase:",
            initialSession.user.id,
            "expires:",
            new Date(initialSession.expires_at! * 1000).toISOString()
          );

          // Set user state immediately
          setSession(initialSession);
          setUser(initialSession.user);
          userRef.current = initialSession.user;

          console.log("AuthContext: User set to:", initialSession.user.id);

          // Ensure user has a Stripe customer
          setSubscriptionLoading(true);
          const customerId = await stripeService.createCustomer();
          console.log("AuthContext: Customer ID:", customerId);

          // Fetch subscription status after setting user
          const subscriptionStatus =
            await stripeService.getSubscriptionStatus();
          console.log("AuthContext: Subscription status:", subscriptionStatus);
          setSubscription(subscriptionStatus);
          setSubscriptionLoading(false);
        } else {
          // Check if we have a refresh token in localStorage
          console.log(
            "AuthContext: No session found from supabase, checking localStorage"
          );
          const storageKey = "nexthaven-auth-token";
          const storedSession = localStorage.getItem(storageKey);

          if (storedSession) {
            try {
              const parsedSession = JSON.parse(storedSession);
              console.log(
                "AuthContext: Found stored session data:",
                parsedSession?.refresh_token
                  ? "has refresh token"
                  : "no refresh token"
              );

              // Try to refresh the session
              if (parsedSession?.refresh_token) {
                console.log(
                  "AuthContext: Attempting to refresh session with stored token"
                );
                const { data: refreshData, error: refreshError } =
                  await supabase.auth.refreshSession({
                    refresh_token: parsedSession.refresh_token,
                  });

                if (refreshError) {
                  console.error(
                    "AuthContext: Error refreshing session:",
                    refreshError
                  );
                } else if (refreshData.session) {
                  console.log("AuthContext: Successfully refreshed session");
                  setSession(refreshData.session);
                  setUser(refreshData.session.user);
                  userRef.current = refreshData.session.user;

                  // Ensure user has a Stripe customer
                  await ensureStripeCustomer();

                  // Fetch subscription status after setting user
                  await fetchSubscriptionStatus();
                  setLoading(false);
                  return;
                }
              }
            } catch (parseError) {
              console.error(
                "AuthContext: Error parsing stored session:",
                parseError
              );
            }
          }

          // Fallback to our auth service if needed
          console.log("AuthContext: Trying auth service as final fallback");
          const fallbackSession = await auth.getSession();

          if (fallbackSession) {
            console.log("AuthContext: Found session from auth service");
            setSession(fallbackSession);
            const user = await auth.getUser();
            setUser(user);
            userRef.current = user;

            // Ensure user has a Stripe customer
            await ensureStripeCustomer();

            // Fetch subscription status after setting user
            await fetchSubscriptionStatus();
          } else {
            console.log("AuthContext: No session found from any source");
            setSession(null);
            setUser(null);
            userRef.current = null;
            setSubscription({ isActive: false });
          }
        }
      } catch (error) {
        console.error("AuthContext: Error getting initial session:", error);
        setSession(null);
        setUser(null);
        userRef.current = null;
        setSubscription({ isActive: false });
      } finally {
        setLoading(false);
      }
    }

    getInitialSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);

        // Always update the session and user immediately
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          userRef.current = session.user;
          console.log(
            "AuthContext: User updated via listener to:",
            session.user.id
          );

          // Wait a moment to ensure state updates have propagated
          setTimeout(async () => {
            try {
              setSubscriptionLoading(true);

              // Ensure user has a Stripe customer on auth change
              const customerId = await stripeService.createCustomer();
              console.log("AuthContext: Customer created/found:", customerId);

              // Get subscription status
              const status = await stripeService.getSubscriptionStatus();
              console.log(
                "AuthContext: Subscription status via listener:",
                status
              );
              setSubscription(status);
            } catch (error) {
              console.error("AuthContext: Error in auth listener:", error);
              setSubscription({ isActive: false });
            } finally {
              setSubscriptionLoading(false);
              setLoading(false);
            }
          }, 100);
        } else {
          setUser(null);
          userRef.current = null;
          setSubscription({ isActive: false });
          setLoading(false);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      console.log("AuthContext: Cleaning up auth listener");
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSubscription = useCallback(async (): Promise<void> => {
    console.log("Manually refreshing subscription status");
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const value = {
    session,
    user,
    loading,
    subscriptionLoading,
    subscription,
    signIn: useCallback(
      (email: string, password: string) => auth.signIn(email, password),
      []
    ),
    signUp: useCallback(
      (email: string, password: string) => auth.signUp(email, password),
      []
    ),
    signOut: useCallback(() => auth.signOut(), []),
    signInWithMagicLink: useCallback(
      (email: string) => auth.signInWithMagicLink(email),
      []
    ),
    refreshSubscription,
    createCheckoutSession: useCallback(
      (priceId: string) => stripeService.createCheckoutSession(priceId),
      []
    ),
    createCustomerPortalSession: useCallback(
      () => stripeService.createCustomerPortalSession(),
      []
    ),
    ensureStripeCustomer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
