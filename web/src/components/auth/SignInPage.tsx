import React from "react";
import { SignIn } from "./SignIn";

interface SignInPageProps {
  onNavigate?: (screen: string) => void;
}

export function SignInPage({ onNavigate }: SignInPageProps = {}) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      <div className="w-full max-w-md">
        <SignIn />
        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate && onNavigate("signUp")}
            className="text-purple-400 hover:text-pink-400 font-medium transition-colors"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
