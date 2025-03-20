import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Crown,
  CreditCard,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface SubscriptionScreenProps {
  onBack?: () => void;
  onNavigate: (screen: string) => void;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

// Hardcoded pricing tiers - in a real app, you would fetch these from your backend
const PRICING_TIERS: PricingTier[] = [
  {
    id: "price_1R4h3aP294DyvJuy3WMspgq6",
    name: "Basic",
    price: 9.99,
    features: [
      "Up to 10 searches per month",
      "Basic property comparison",
      "Email support",
    ],
  },
  {
    id: "price_1R4hBZP294DyvJuyjqGQ7eqt",
    name: "Pro",
    price: 19.99,
    features: [
      "Unlimited searches",
      "Advanced property comparison",
      "Priority support",
      "Booking assistance",
    ],
    popular: true,
  },
];

export default function SubscriptionScreen({
  onNavigate,
}: SubscriptionScreenProps) {
  const {
    subscription,
    createCheckoutSession,
    createCustomerPortalSession,
    refreshSubscription,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
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

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedTier(priceId);

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
  if (refreshing) {
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
  if (subscription.isActive) {
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
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Choose Your Plan
          </h2>
          <p className="text-gray-400 mt-2">
            Unlock premium features and start finding your perfect accommodation
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl shadow-lg border ${
                tier.popular
                  ? "border-purple-700 ring-2 ring-purple-700/20"
                  : "border-gray-800"
              } flex flex-col`}
            >
              {tier.popular && (
                <div className="self-end bg-purple-700 text-white px-3 py-1 rounded-full text-xs uppercase font-bold mb-4">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>

              <div className="mb-6">
                <span className="text-3xl font-bold">${tier.price}</span>
                <span className="text-gray-400">/month</span>
              </div>

              <ul className="mb-6 flex-grow">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 mb-3">
                    <Check
                      size={18}
                      className="text-green-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.id)}
                disabled={loading && selectedTier === tier.id}
                className={`w-full py-3 rounded-lg ${
                  tier.popular
                    ? "bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600"
                    : "bg-gray-800 hover:bg-gray-700"
                } text-white transition-all`}
              >
                {loading && selectedTier === tier.id ? (
                  <Loader2 size={20} className="animate-spin mx-auto" />
                ) : (
                  "Subscribe"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
