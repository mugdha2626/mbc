"use client";

import { useState } from "react";
import Image from "next/image";

interface OnboardingFlowProps {
  onComplete: () => void;
  userName?: string;
}

const slides = [
  {
    id: 1,
    title: "Welcome to tmap",
    subtitle: "The social map of food culture",
    description: "Discover hidden gems, collect iconic dishes, and earn rewards for your taste.",
    gradient: "from-[#9b87c5] via-[#b8a8d8] to-[#c8b8e8]",
    icon: (
      <div className="relative">
        <div className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl shadow-black/20 overflow-hidden">
          <Image
            src="/icon.png"
            alt="tmap"
            width={100}
            height={100}
            className="w-24 h-24 object-contain"
          />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/30 animate-ping" />
        <div className="absolute -bottom-4 -left-4 w-6 h-6 rounded-full bg-white/20 animate-pulse" />
      </div>
    ),
  },
  {
    id: 2,
    title: "Mint Iconic Dishes",
    subtitle: "Collect food as digital stamps",
    description: "When you try an amazing dish, mint it as a collectible. Be the first to discover — pay less, earn more.",
    gradient: "from-[#f0c8b8] via-[#e8b8a8] to-[#d8a898]",
    icon: (
      <div className="relative">
        <div className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
          <div className="text-6xl">🍜</div>
        </div>
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </div>
        <div className="absolute -bottom-2 -left-2 px-3 py-1 rounded-full bg-green-500/90 text-white text-xs font-bold shadow-lg">
          +2.5% earned
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Earn As You Share",
    subtitle: "The bonding curve rewards early tastemakers",
    description: "Price rises with demand. Early backers profit when dishes trend. Refer friends and earn on every mint.",
    gradient: "from-[#a8d4c0] via-[#b8d8c8] to-[#c0e8d8]",
    icon: (
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
          <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-xs">🧑</div>
          <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-xs">👩</div>
          <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-xs">👨</div>
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/90 text-green-600 text-sm font-bold shadow-lg whitespace-nowrap">
          $0.01 → $2.50
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Build Your Taste Map",
    subtitle: "Your food journey, onchain forever",
    description: "Every dish you back becomes part of your collection. Show off your taste and unlock exclusive rewards.",
    gradient: "from-[#a8c8e8] via-[#98b8d8] to-[#88a8c8]",
    icon: (
      <div className="relative">
        <div className="w-36 h-28 rounded-2xl bg-white/20 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1.5 p-3">
              {["🍕", "🍣", "🌮", "🍜", "🍔", "🥗"].map((emoji, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-lg bg-white/30 flex items-center justify-center text-lg transform hover:scale-110 transition-transform"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
          <span className="text-xs">✨</span>
        </div>
      </div>
    ),
  },
];

export function OnboardingFlow({ onComplete, userName }: OnboardingFlowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection("next");
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDirection("prev");
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const displayTitle = currentSlide === 0 && userName
    ? `Welcome, ${userName}!`
    : slide.title;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col transition-opacity duration-500 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-all duration-700`}
      />

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl animate-float" />
        <div className="absolute top-40 right-5 w-24 h-24 rounded-full bg-white/10 blur-2xl animate-float-delayed" />
        <div className="absolute bottom-32 left-20 w-40 h-40 rounded-full bg-white/5 blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-28 h-28 rounded-full bg-white/10 blur-2xl animate-float-delayed" />
      </div>

      {/* Skip button */}
      <div className="relative z-10 flex justify-end p-4 safe-top">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        {/* Icon */}
        <div
          key={slide.id}
          className="mb-8 animate-slide-up"
        >
          {slide.icon}
        </div>

        {/* Text content */}
        <div
          key={`text-${slide.id}`}
          className="text-center animate-fade-in-up"
        >
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {displayTitle}
          </h1>
          <p className="text-lg text-white/90 font-medium mb-4">
            {slide.subtitle}
          </p>
          <p className="text-white/70 max-w-xs mx-auto leading-relaxed">
            {slide.description}
          </p>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="relative z-10 px-6 pb-6 mb-[env(safe-area-inset-bottom)]">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentSlide ? "next" : "prev");
                setCurrentSlide(index);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {currentSlide > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 py-3.5 rounded-2xl bg-white/20 backdrop-blur-sm text-white font-semibold transition-all hover:bg-white/30 active:scale-[0.98]"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 py-3.5 rounded-2xl bg-white text-gray-900 font-semibold transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg shadow-black/10 ${
              currentSlide === 0 ? "w-full" : ""
            }`}
          >
            {isLastSlide ? "Let's Go!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
