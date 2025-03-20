import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "./supabase";

// Make sure to replace with your actual Stripe public key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionStatus {
  isActive: boolean;
  planId?: string;
  planName?: string;
  currentPeriodEnd?: string;
}

export const stripeService = {
  /**
   * Create a customer in Stripe for the current user
   */
  async createCustomer(): Promise<string | null> {
    try {
      console.log("Creating Stripe customer for current user");

      // Check if user is logged in first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("Cannot create customer: No authenticated user");
        return null;
      }

      // Call the function to create a customer
      const { data, error } = await supabase.functions.invoke(
        "create-stripe-customer",
        {
          body: {},
        }
      );

      if (error) {
        console.error("Error creating Stripe customer:", error);
        return null;
      }

      console.log("Customer creation response:", data);
      return data.customerId || null;
    } catch (error) {
      console.error("Exception creating Stripe customer:", error);
      return null;
    }
  },

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(priceId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: { priceId },
        }
      );

      if (error) {
        console.error("Error creating checkout session:", error);
        return null;
      }

      return data.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return null;
    }
  },

  /**
   * Create a customer portal session for managing subscriptions
   */
  async createCustomerPortalSession(): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-portal-session",
        {
          body: {},
        }
      );

      if (error) {
        console.error("Error creating portal session:", error);
        return null;
      }

      return data.url;
    } catch (error) {
      console.error("Error creating portal session:", error);
      return null;
    }
  },

  /**
   * Get the current user's subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      console.log("Fetching subscription status...");

      // Check if user is logged in first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("Cannot check subscription: No authenticated user");
        return { isActive: false };
      }

      console.log("User authenticated, checking subscription...");

      // Call the function with timeout
      const { data, error } = await Promise.race([
        supabase.functions.invoke("get-subscription-status", {
          body: { userId: user.id },
        }),
        // Add a timeout to prevent hanging
        new Promise<{ data: null; error: Error }>(
          (resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: null,
                  error: new Error("Subscription status check timed out"),
                }),
              10000
            ) // 10 second timeout
        ),
      ]);

      if (error) {
        console.error("Error from Supabase Function:", error);
        // For now, to prevent blocking the UI, we'll default to inactive
        return { isActive: false };
      }

      console.log("Subscription data received:", data);

      if (!data) {
        console.warn("Empty response from subscription status endpoint");
        return { isActive: false };
      }

      // Ensure isActive is boolean
      return {
        isActive: data.isActive === true,
        planId: data.planId,
        planName: data.planName,
        currentPeriodEnd: data.currentPeriodEnd,
      };
    } catch (error) {
      console.error("Exception checking subscription status:", error);
      // Return inactive for any errors to avoid blocking the UI
      return { isActive: false };
    }
  },

  /**
   * Get Stripe instance
   */
  getStripe() {
    return stripePromise;
  },
};
