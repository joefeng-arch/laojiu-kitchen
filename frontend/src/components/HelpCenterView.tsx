import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Rocket,
  BookOpen,
  Scale,
  PlayCircle,
  CalendarDays,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

interface HelpCenterViewProps {
  onBack: () => void;
}

interface HelpSection {
  id: string;
  iconElement: React.ReactNode;
  titleKey: string;
  contentKey: string;
  iconColor: string;
}

const SECTIONS: HelpSection[] = [
  {
    id: "quickstart",
    iconElement: <Rocket className="w-5 h-5" />,
    titleKey: "help.sections.quickstart.title",
    contentKey: "help.sections.quickstart.content",
    iconColor: "text-orange-500 bg-orange-50",
  },
  {
    id: "recipes",
    iconElement: <BookOpen className="w-5 h-5" />,
    titleKey: "help.sections.recipes.title",
    contentKey: "help.sections.recipes.content",
    iconColor: "text-green-600 bg-green-50",
  },
  {
    id: "scaling",
    iconElement: <Scale className="w-5 h-5" />,
    titleKey: "help.sections.scaling.title",
    contentKey: "help.sections.scaling.content",
    iconColor: "text-blue-600 bg-blue-50",
  },
  {
    id: "sop",
    iconElement: <PlayCircle className="w-5 h-5" />,
    titleKey: "help.sections.sop.title",
    contentKey: "help.sections.sop.content",
    iconColor: "text-purple-600 bg-purple-50",
  },
  {
    id: "mealplan",
    iconElement: <CalendarDays className="w-5 h-5" />,
    titleKey: "help.sections.mealplan.title",
    contentKey: "help.sections.mealplan.content",
    iconColor: "text-red-500 bg-red-50",
  },
  {
    id: "pantry",
    iconElement: <ShieldCheck className="w-5 h-5" />,
    titleKey: "help.sections.pantry.title",
    contentKey: "help.sections.pantry.content",
    iconColor: "text-emerald-600 bg-emerald-50",
  },
  {
    id: "faq",
    iconElement: <HelpCircle className="w-5 h-5" />,
    titleKey: "help.sections.faq.title",
    contentKey: "help.sections.faq.content",
    iconColor: "text-gray-600 bg-gray-100",
  },
];

export default function HelpCenterView({ onBack }: HelpCenterViewProps) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{t("help.title")}</h1>
        </div>
      </div>

      {/* Intro */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-gradient-to-br from-[#ff6b35] to-[#ff8f35] rounded-2xl p-5 text-white">
          <h2 className="text-lg font-bold mb-1">{t("help.heroTitle")}</h2>
          <p className="text-sm text-white/80">{t("help.heroDesc")}</p>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="px-4 py-3 space-y-2 pb-24">
        {SECTIONS.map((section) => {
          const isOpen = openId === section.id;
          return (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${section.iconColor}`}
                >
                  {section.iconElement}
                </div>
                <span className="flex-1 text-left text-sm font-semibold text-gray-800">
                  {t(section.titleKey)}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {/* Content (collapsed/expanded) */}
              {isOpen && (
                <div className="px-4 pb-4 pt-0">
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {t(section.contentKey)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
