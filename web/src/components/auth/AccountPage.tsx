import React from "react";
import { useAuth } from "../../context/AuthContext";
import { SignOut } from "./SignOut";
import { User, Mail, Shield } from "lucide-react";

interface AccountPageProps {
  onNavigate?: (screen: string) => void;
}

export function AccountPage({ onNavigate }: AccountPageProps = {}) {
  const { user, loading } = useAuth();

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-black">
        <div className="text-center">
          <p className="text-pink-500 mb-4">
            You need to be signed in to view your account
          </p>
          <button
            onClick={() => onNavigate && onNavigate("signIn")}
            className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-600"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

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
