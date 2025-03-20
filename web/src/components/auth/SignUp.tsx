import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";

export function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signUp } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await signUp(email, password);

      if (error) {
        throw error;
      }

      // Set home page as the redirect destination after authentication
      sessionStorage.setItem("redirectAfterAuth", "home");

      setMessage("Check your email for the confirmation link");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to sign up");
      console.error("Sign up error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-black border border-gray-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-serif mb-6 text-center text-white">
        Sign Up
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-pink-900/30 border border-pink-800 text-pink-200 rounded-lg flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-purple-900/30 border border-purple-800 text-purple-200 rounded-lg flex items-start">
          <CheckCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSignUp}>
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-gray-300 font-medium mb-2 flex items-center"
          >
            <Mail size={16} className="mr-2" />
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-gray-300 font-medium mb-2 flex items-center"
          >
            <Lock size={16} className="mr-2" />
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="confirmPassword"
            className="block text-gray-300 font-medium mb-2 flex items-center"
          >
            <Lock size={16} className="mr-2" />
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-700 to-pink-700 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200 flex justify-center items-center"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Processing...</span>
            </div>
          ) : (
            <span>Sign Up</span>
          )}
        </button>
      </form>
    </div>
  );
}
