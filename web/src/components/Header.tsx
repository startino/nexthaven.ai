import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogOut, User, Loader2, CreditCard, Crown } from "lucide-react";

// Define the screen type to match App.tsx
type Screen =
  | "home"
  | "search"
  | "loading"
  | "compare"
  | "history"
  | "booking"
  | "auth"
  | "signIn"
  | "signUp"
  | "account"
  | "subscription";

interface HeaderProps {
  onNavigate: (screen: Screen) => void;
  currentScreen?: string; // Make optional since we don't use it
}

export function Header({ onNavigate }: HeaderProps) {
  const { user, loading, signOut, subscription } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      onNavigate("home");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Only render header when user is authenticated and not loading
  if (loading || !user) return null;

  return (
    <header className="bg-black border-b border-gray-800 text-white py-3 px-5 sm:px-6 flex justify-between items-center shadow-md backdrop-blur-sm bg-black/90 sticky top-0 z-50">
      <h1
        className="text-2xl font-serif cursor-pointer font-bold tracking-tight"
        onClick={() => onNavigate("home")}
      >
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-sm">
          NextHaven.ai
        </span>
      </h1>

      <div className="flex items-center gap-3">
        {subscription.isActive ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-900/40 rounded-full text-xs">
            <Crown size={14} className="text-purple-300" />
            <span className="text-purple-200">
              {subscription.planName || "Premium"}
            </span>
          </div>
        ) : null}

        <button
          onClick={() => onNavigate("subscription")}
          className={`p-2 rounded-full ${
            subscription.isActive
              ? "bg-green-900/40 hover:bg-green-900/60"
              : "bg-purple-900/60 hover:bg-purple-900/80"
          } transition-colors shadow-sm`}
          title={subscription.isActive ? "Manage Subscription" : "Get Premium"}
        >
          <CreditCard
            size={18}
            className={
              subscription.isActive ? "text-green-200" : "text-purple-200"
            }
          />
        </button>

        <button
          onClick={() => onNavigate("account")}
          className="p-2 rounded-full bg-purple-900/60 hover:bg-purple-900/80 transition-colors shadow-sm"
          title="My Account"
        >
          <User size={18} className="text-purple-200" />
        </button>

        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="p-2 rounded-full bg-gray-800/80 hover:bg-gray-800 transition-colors flex items-center justify-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          title="Sign Out"
        >
          {isSigningOut ? (
            <Loader2 size={18} className="text-gray-200 animate-spin" />
          ) : (
            <LogOut size={18} className="text-gray-200" />
          )}
        </button>
      </div>
    </header>
  );
}
