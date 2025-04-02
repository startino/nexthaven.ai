import React from "react";
import { SignUp } from "./SignUp";

interface SignUpPageProps {
  onNavigate?: (screen: string) => void;
}

export function SignUpPage({ onNavigate }: SignUpPageProps = {}) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      <div className="w-full max-w-md">
        <SignUp />
        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate && onNavigate("signIn")}
            className="text-purple-400 hover:text-pink-400 font-medium transition-colors"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
