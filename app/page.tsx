"use client";

import { useFarcaster } from "./providers/FarcasterProvider";

export default function Home() {
  const { user, isLoaded } = useFarcaster();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <h1 className="text-2xl font-bold">tmap</h1>
          {user && (
            <div className="flex items-center gap-3">
              {user.pfpUrl && (
                <img
                  src={user.pfpUrl}
                  alt={user.username || "Profile"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <div className="text-sm font-medium">
                  {user.displayName || user.username}
                </div>
                <div className="text-xs text-zinc-500">FID: {user.fid}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome to tmap!</h2>
            <p className="text-zinc-400 text-lg">
              Discover, mint, and trade food culture tokens
            </p>
          </div>

          {/* User Info Card */}
          <div className="bg-zinc-900 rounded-lg p-6 mb-6 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-4">Your Profile</h3>
            {user ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Username:</span>
                  <span className="font-mono">@{user.username || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Display Name:</span>
                  <span>{user.displayName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">FID:</span>
                  <span className="font-mono">{user.fid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tokens Created:</span>
                  <span className="font-mono">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tokens Owned:</span>
                  <span className="font-mono">0</span>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500">
                Open this app in Farcaster to see your profile
              </p>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
              <div className="text-3xl mb-3">🗺️</div>
              <h3 className="text-lg font-semibold mb-2">Explore Map</h3>
              <p className="text-sm text-zinc-400">
                Discover dishes and restaurants around you
              </p>
            </div>

            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
              <div className="text-3xl mb-3">🔥</div>
              <h3 className="text-lg font-semibold mb-2">Trending</h3>
              <p className="text-sm text-zinc-400">
                See the hottest dishes in your area
              </p>
            </div>

            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="text-lg font-semibold mb-2">Create Token</h3>
              <p className="text-sm text-zinc-400">
                Be the first to mint a dish token
              </p>
            </div>
          </div>

          {/* Dev Info */}
          <div className="mt-8 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <h4 className="font-semibold mb-2">Testing Status</h4>
            <div className="text-sm text-zinc-400 space-y-1">
              <p>SDK Loaded: {isLoaded ? "Yes" : "No"}</p>
              <p>User Context: {user ? "Available" : "Not available (open in Farcaster)"}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
