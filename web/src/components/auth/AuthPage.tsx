import React, { useState, useEffect } from "react";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";
import { useAuth } from "../../context/AuthContext";
import { SignOut } from "./SignOut";
import { User, Mail, Shield, Search, Building, History } from "lucide-react";

interface AuthPageProps {
  onNavigate?: (screen: string) => void;
}

export function AuthPage({ onNavigate }: AuthPageProps = {}) {
  const [isSignIn, setIsSignIn] = useState(true);
  const { user, loading } = useAuth();
  const [redirectSource, setRedirectSource] = useState<string | null>(null);

  useEffect(() => {
    const source = sessionStorage.getItem("redirectAfterAuth");
    setRedirectSource(source);
  }, []);

  // If user is already logged in, show a different view
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-black">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-10 rounded-full bg-purple-700 mb-4"></div>
          <div className="h-4 w-24 bg-gray-700 rounded mb-2.5"></div>
          <div className="h-3 w-16 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 bg-black">
        <div className="max-w-md w-full bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl shadow-lg border border-gray-800">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-purple-700 to-pink-700 flex items-center justify-center">
              <User size={40} className="text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-serif mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Your Account
          </h2>

          <div className="bg-black/50 p-5 rounded-lg mb-6 border border-gray-800">
            <div className="flex items-center mb-4 text-gray-300">
              <Mail size={18} className="mr-3 text-purple-400" />
              <span className="text-sm">Email:</span>
              <span className="ml-auto text-white">{user.email}</span>
            </div>

            <div className="flex items-center text-gray-300">
              <Shield size={18} className="mr-3 text-purple-400" />
              <span className="text-sm">User ID:</span>
              <span
                className="ml-auto text-white truncate max-w-[160px]"
                title={user.id}
              >
                {user.id.substring(0, 8)}...
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <SignOut className="w-full" onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    );
  }

  // Determine message based on redirect source
  const getRedirectMessage = () => {
    if (!redirectSource) return null;

    let icon = <Search size={24} className="text-purple-400" />;
    let message = "Sign in to access our premium features";

    switch (redirectSource) {
      case "search":
        icon = <Search size={24} className="text-purple-400" />;
        message = "Sign in to search for your next accommodation";
        break;
      case "compare":
        icon = <Building size={24} className="text-pink-400" />;
        message = "Sign in to compare properties";
        break;
      case "history":
        icon = <History size={24} className="text-indigo-400" />;
        message = "Sign in to view your search history";
        break;
      case "booking":
        icon = <Building size={24} className="text-pink-400" />;
        message = "Sign in to complete your booking";
        break;
    }

    return (
      <div className="mb-6 p-4 bg-black/50 border border-gray-800 rounded-lg">
        <div className="flex items-center justify-center mb-3">{icon}</div>
        <p className="text-center text-white">{message}</p>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      <div className="w-full max-w-md">
        {getRedirectMessage()}
        {isSignIn ? <SignIn /> : <SignUp />}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignIn(!isSignIn)}
            className="text-purple-400 hover:text-pink-400 font-medium transition-colors"
          >
            {isSignIn
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
