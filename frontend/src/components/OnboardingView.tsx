import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChefHat,
  BookOpen,
  Scale,
  PlayCircle,
  CalendarDays,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

interface OnboardingViewProps {
  onComplete: () => void;
}

interface OnboardingPage {
  icon: React.ReactNode;
  bgGradient: string;
  iconBg: string;
  titleKey: string;
  descKey: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: <ChefHat className="w-12 h-12" />,
    bgGradient: "from-[#ff6b35] to-[#ff8f35]",
    iconBg: "bg-white/20",
    titleKey: "onboarding.pages.welcome.title",
    descKey: "onboarding.pages.welcome.desc",
  },
  {
    icon: <BookOpen className="w-12 h-12" />,
    bgGradient: "from-[#2D5016] to-[#43682b]",
    iconBg: "bg-white/20",
    titleKey: "onboarding.pages.recipes.title",
    descKey: "onboarding.pages.recipes.desc",
  },
  {
    icon: <Scale className="w-12 h-12" />,
    bgGradient: "from-[#1e40af] to-[#3b82f6]",
    iconBg: "bg-white/20",
    titleKey: "onboarding.pages.scaling.title",
    descKey: "onboarding.pages.scaling.desc",
  },
  {
    icon: <PlayCircle className="w-12 h-12" />,
    bgGradient: "from-[#7c3aed] to-[#a855f7]",
    iconBg: "bg-white/20",
    titleKey: "onboarding.pages.sop.title",
    descKey: "onboarding.pages.sop.desc",
  },
  {
    icon: <CalendarDays className="w-12 h-12" />,
    bgGradient: "from-[#dc2626] to-[#ef4444]",
    iconBg: "bg-white/20",
    titleKey: "onboarding.pages.mealPlan.title",
    descKey: "onboarding.pages.mealPlan.desc",
  },
];

export default function OnboardingView({ onComplete }: OnboardingViewProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);

  const isLast = currentPage === PAGES.length - 1;
  const page = PAGES[currentPage];

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("hasSeenOnboarding", "true");
      onComplete();
    } else {
      setCurrentPage((p) => p + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    onComplete();
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${page.bgGradient} flex flex-col items-center justify-between px-6 py-10 text-white transition-all duration-500`}
    >
      {/* Top: Skip */}
      <div className="w-full flex justify-end">
        {!isLast && (
          <button
            onClick={handleSkip}
            className="text-sm text-white/70 hover:text-white transition px-3 py-1"
          >
            {t("onboarding.skip")}
          </button>
        )}
      </div>

      {/* Center: Icon + Text */}
      <div className="flex flex-col items-center text-center flex-1 justify-center max-w-sm">
        {/* Icon */}
        <div
          className={`w-28 h-28 rounded-3xl ${page.iconBg} flex items-center justify-center mb-8 shadow-lg`}
        >
          {page.icon}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-3 leading-tight">
          {t(page.titleKey)}
        </h1>

        {/* Description */}
        <p className="text-sm text-white/80 leading-relaxed">
          {t(page.descKey)}
        </p>
      </div>

      {/* Bottom: Dots + Button */}
      <div className="w-full flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {PAGES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentPage
                  ? "w-8 bg-white"
                  : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={handleNext}
          className="w-full max-w-xs py-3.5 bg-white text-gray-800 font-bold rounded-2xl shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          {isLast ? (
            <>
              {t("onboarding.start")}
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              {t("onboarding.next")}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
