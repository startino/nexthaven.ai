import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Crown,
  CreditCard,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

interface SubscriptionScreenProps {
  onBack?: () => void;
  onNavigate: (screen: string) => void;
}

interface PricingOption {
  id: string;
  period: "monthly" | "yearly";
  price: number;
  description: string;
  savingsAmount?: number;
}

interface PricingTier {
  name: string;
  description: string;
  features: string[];
  options: PricingOption[];
}

// Single tier with monthly and yearly options
const PRICING_TIER: PricingTier = {
  name: "Premium",
  description: "Everything you need to find your perfect accommodation",
  features: [
    "Unlimited searches",
    "Advanced property comparison",
    "Priority support",
    "Booking assistance",
    "Save favorite properties",
    "Personalized recommendations",
  ],
  options: [
    {
      id: "price_1R4h3aP294DyvJuy3WMspgq6", // Replace with your actual monthly price ID
      period: "monthly",
      price: 19.99,
      description: "Monthly subscription",
    },
    {
      id: "price_1R4hBZP294DyvJuyjqGQ7eqt", // Replace with your actual yearly price ID
      period: "yearly",
      price: 199.99,
      description: "Annual subscription",
      savingsAmount: 39.89, // 19.99*12 - 199.99 = 39.89
    },
  ],
};

export default function SubscriptionScreen({
  onNavigate,
}: SubscriptionScreenProps) {
  const {
    subscription,
    createCheckoutSession,
    createCustomerPortalSession,
    subscriptionLoading,
    refreshSubscription,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Refresh subscription status only when component mounts, not on every render
    const fetchStatus = async () => {
      try {
        // Only refresh if we're not already refreshing
        if (!refreshing) {
          setRefreshing(true);
          await refreshSubscription();
        }
      } catch (err) {
        console.error("Error refreshing subscription:", err);
        setError("Couldn't verify subscription status. Please try again.");
      } finally {
        setRefreshing(false);
      }
    };

    fetchStatus();
    // Empty dependency array ensures this only runs once when component mounts
  }, []);

  const handleRefreshSubscription = async () => {
    // Don't allow multiple simultaneous refreshes
    if (refreshing) return;

    try {
      setRefreshing(true);
      setError(null);
      await refreshSubscription();
    } catch (err) {
      console.error("Error refreshing subscription:", err);
      setError("Failed to refresh subscription status. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubscribe = async () => {
    const priceId =
      selectedOption === "monthly"
        ? PRICING_TIER.options[0].id
        : PRICING_TIER.options[1].id;

    try {
      setLoading(true);
      setError(null);

      console.log("Creating checkout session for price:", priceId);
      const url = await createCheckoutSession(priceId);

      if (url) {
        console.log("Redirecting to checkout with session:", url);
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error("Failed to create checkout session - empty session ID");
      }
    } catch (err) {
      console.error("Error creating checkout session:", err);
      setError("Failed to start subscription process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Creating customer portal session");
      const portalUrl = await createCustomerPortalSession();

      if (portalUrl) {
        console.log("Redirecting to customer portal:", portalUrl);
        // Redirect to Customer Portal
        window.location.href = portalUrl;
      } else {
        throw new Error("Failed to create customer portal session - empty URL");
      }
    } catch (err) {
      console.error("Error creating customer portal session:", err);
      setError("Failed to open subscription management. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If we're refreshing subscription status
  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl shadow-lg border border-gray-800 text-center">
          <Loader2
            size={36}
            className="animate-spin mx-auto mb-4 text-purple-400"
          />
          <h2 className="text-xl font-serif mb-2">
            Checking subscription status...
          </h2>
          <p className="text-gray-400">
            Please wait a moment while we verify your account.
          </p>
        </div>
      </div>
    );
  }

  // If user has an active subscription, show subscription management
  if (subscription.isActive)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl shadow-lg border border-gray-800">
          <div className="mb-8 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-700 to-green-500 flex items-center justify-center">
              <Crown size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-green-400">
              Active Subscription
            </h2>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl mb-8 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {subscription.planName || "Premium Plan"}
              </h3>
              <span className="px-3 py-1 bg-green-900 text-green-400 rounded-full text-sm">
                Active
              </span>
            </div>

            {subscription.currentPeriodEnd && (
              <p className="text-gray-400 mb-4">
                Your subscription renews on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={handleRefreshSubscription}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all"
              >
                {refreshing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Refresh"
                )}
              </button>
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <CreditCard size={20} />
                    <span>Manage Subscription</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => onNavigate("search")}
              className="px-6 py-3 bg-gradient-to-r from-purple-700 to-pink-700 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <span>Continue to Search</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Upgrade to Premium
          </h2>
          <p className="text-gray-400 mt-2">
            Find your perfect accommodation with our premium features
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-center flex items-center justify-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button
              onClick={handleRefreshSubscription}
              className="ml-4 px-3 py-1 bg-red-900/30 hover:bg-red-900/50 rounded-md transition-colors"
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Retry"
              )}
            </button>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/10 ring-1 ring-white/10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            {/* Left side: features */}
            <div className="flex-1">
              <h3 className="text-2xl font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                {PRICING_TIER.name}
              </h3>
              <p className="text-gray-300 mb-6">{PRICING_TIER.description}</p>

              <h4 className="font-medium text-white mb-3">
                Everything included:
              </h4>
              <ul className="space-y-3 mb-6">
                {PRICING_TIER.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check
                      size={18}
                      className="text-green-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right side: pricing options */}
            <div className="flex-1">
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl ring-1 ring-white/10">
                <div className="flex justify-center gap-2 mb-6">
                  <button
                    onClick={() => setSelectedOption("monthly")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedOption === "monthly"
                        ? "bg-purple-700 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setSelectedOption("yearly")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedOption === "yearly"
                        ? "bg-purple-700 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Yearly
                    {PRICING_TIER.options[1].savingsAmount && (
                      <span className="bg-purple-900 text-white text-xs px-2 py-0.5 rounded-full">
                        Save ${PRICING_TIER.options[1].savingsAmount}
                      </span>
                    )}
                  </button>
                </div>

                {selectedOption === "monthly" ? (
                  <div className="text-center mb-4">
                    <div className="flex items-end justify-center">
                      <span className="text-4xl font-bold">
                        ${PRICING_TIER.options[0].price}
                      </span>
                      <span className="text-gray-400 ml-1">/month</span>
                    </div>
                    <div className="flex items-center justify-center mt-2 text-gray-400">
                      <CalendarDays size={16} className="mr-1" />
                      <span>Billed monthly</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center mb-4">
                    <div className="flex items-end justify-center">
                      <span className="text-4xl font-bold">
                        ${PRICING_TIER.options[1].price}
                      </span>
                      <span className="text-gray-400 ml-1">/year</span>
                    </div>
                    <div className="flex items-center justify-center mt-2 text-gray-400">
                      <CalendarDays size={16} className="mr-1" />
                      <span>Billed annually</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white transition-all mt-4"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin mx-auto" />
                  ) : (
                    "Subscribe Now"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
