import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false,
  });

  // Add a ref to track if a subscription check is in progress
  const isCheckingSubscription = useRef(false);
  // Add a ref to track the last check time to avoid frequent calls
  const lastCheckTime = useRef(0);
  // Minimum time between checks in milliseconds (5 seconds)
  const MIN_CHECK_INTERVAL = 5000;

  // Ensure the user has a Stripe customer
  const ensureStripeCustomer = async (): Promise<string | null> => {
    if (!user) {
      console.warn(
        "AuthContext: Cannot ensure Stripe customer - no user logged in"
      );
      return null;
    }

    try {
      console.log("AuthContext: Ensuring user has Stripe customer");
      return await stripeService.createCustomer();
    } catch (error) {
      console.error("AuthContext: Error ensuring Stripe customer:", error);
      return null;
    }
  };

  const fetchSubscriptionStatus = async () => {
    // If a check is already in progress or not enough time has passed, skip
    const now = Date.now();
    if (
      isCheckingSubscription.current ||
      now - lastCheckTime.current < MIN_CHECK_INTERVAL
    ) {
      console.log("AuthContext: Skipping duplicate subscription check");
      return;
    }

    if (!user) {
      console.log("AuthContext: No user, setting inactive subscription status");
      setSubscription({ isActive: false });
      return;
    }

    try {
      // Set the flag to prevent duplicate calls
      isCheckingSubscription.current = true;
      lastCheckTime.current = now;

      console.log(
        "AuthContext: Fetching subscription status for user:",
        user.id
      );

      // Ensure the user has a Stripe customer before checking subscription
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
      // Reset the flag when done
      isCheckingSubscription.current = false;
    }
  };

  useEffect(() => {
    // Get initial session
    async function getInitialSession() {
      setLoading(true);

      try {
        // First try to get the session from supabase directly
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession) {
          console.log(
            "Initial session found from supabase:",
            initialSession.user.id
          );
          setSession(initialSession);
          setUser(initialSession.user);

          // Ensure user has a Stripe customer
          await ensureStripeCustomer();

          // Fetch subscription status after setting user
          await fetchSubscriptionStatus();
        } else {
          // Fallback to our auth service if needed
          console.log("No session found from supabase, trying auth service");
          const session = await auth.getSession();
          setSession(session);

          if (session) {
            const user = await auth.getUser();
            setUser(user);

            // Ensure user has a Stripe customer
            await ensureStripeCustomer();

            // Fetch subscription status after setting user
            await fetchSubscriptionStatus();
          } else {
            console.log("No session found from any source");
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    }

    getInitialSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch subscription status when auth state changes
        if (session?.user) {
          // Ensure user has a Stripe customer on auth change
          await ensureStripeCustomer();
          await fetchSubscriptionStatus();
        } else {
          setSubscription({ isActive: false });
        }

        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshSubscription = async () => {
    console.log("Manually refreshing subscription status");
    return fetchSubscriptionStatus();
  };

  const value = {
    session,
    user,
    loading,
    subscription,
    signIn: (email: string, password: string) => auth.signIn(email, password),
    signUp: (email: string, password: string) => auth.signUp(email, password),
    signOut: () => auth.signOut(),
    signInWithMagicLink: (email: string) => auth.signInWithMagicLink(email),
    refreshSubscription,
    createCheckoutSession: (priceId: string) =>
      stripeService.createCheckoutSession(priceId),
    createCustomerPortalSession: () =>
      stripeService.createCustomerPortalSession(),
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
