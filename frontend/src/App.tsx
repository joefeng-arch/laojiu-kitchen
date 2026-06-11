import React, { useEffect, useState } from "react";
import { Home, Compass, Timer, ShieldCheck, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api, tokenStore, adminTokenStore, adminApi, AdminInfo } from "./api";
type ImportedRecipeData = Awaited<ReturnType<typeof api.parseRecipeText>>["recipe"];

// Views
import HomeView from "./components/HomeView";
import RecipeDetailView from "./components/RecipeDetailView";
import CreateRecipeView from "./components/CreateRecipeView";
import SopView from "./components/SopView";
import TimerView from "./components/TimerView";
import DiscoverView from "./components/DiscoverView";
import ProfileView from "./components/ProfileView";
import PantryView from "./components/PantryView";
import MyRecipesView from "./components/MyRecipesView";
import ShoppingListView from "./components/ShoppingListView";
import MealPlanView from "./components/MealPlanView";
import OnboardingView from "./components/OnboardingView";
import HelpCenterView from "./components/HelpCenterView";
import AdminLoginView from "./components/AdminLoginView";
import AdminDashboardView from "./components/AdminDashboardView";
import AdminChangePasswordView from "./components/AdminChangePasswordView";
import RecipeImportView from "./components/RecipeImportView";

type ViewState = "home" | "discover" | "timers" | "pantry" | "profile" | "detail" | "sop" | "create" | "my-recipes" | "shopping-list" | "meal-plan" | "onboarding" | "help" | "import";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>("home");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [detailReturnView, setDetailReturnView] = useState<ViewState>("home");
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);
  const [targetServings, setTargetServings] = useState(2);
  const [shoppingListResult, setShoppingListResult] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [importedRecipeData, setImportedRecipeData] = useState<ImportedRecipeData | null>(null);
  const { t } = useTranslation();

  // ── Admin mode ────────────────────────────────────────────
  // Access via ?admin=1 in the URL
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminInfo | null>(null);

  // Boot: detect admin mode and handle user auth
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        // ── Admin mode detection ──
        if (params.get("admin") === "1") {
          setIsAdminMode(true);
          // Try to restore admin session from existing token
          const existingToken = adminTokenStore.get();
          if (existingToken) {
            try {
              const info = await adminApi.whoami();
              setAdminUser(info as AdminInfo);
            } catch {
              adminTokenStore.clear(); // token expired/invalid
            }
          }
          // Clean admin param from URL (keep other params)
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("admin");
            window.history.replaceState({}, "", url.pathname + (url.search || "") + url.hash);
          } catch {}
          setAuthReady(true);
          return; // skip mini-app auth flow
        }

        // ── Mini-app auth flow ──
        const urlToken = params.get("token");
        const scene = params.get("scene");

        if (urlToken) {
          tokenStore.set(urlToken);
        } else if (!tokenStore.get()) {
          try {
            await api.login("mock-dev-user");
          } catch (e) {
            console.error("login failed", e);
          }
        }

        // Clean handled params from URL
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          url.searchParams.delete("scene");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        } catch {}

        // Resolve share scene → deep-link to recipe detail
        if (scene) {
          try {
            const { recipeId } = await api.resolveShareScene(scene);
            setSelectedRecipeId(recipeId);
            setCurrentView("detail");
          } catch (e) {
            console.error("Failed to resolve share scene", e);
          }
        }

        // Show onboarding for new users (unless deep-linked via scene)
        if (!scene && !localStorage.getItem("hasSeenOnboarding")) {
          setCurrentView("onboarding");
        }
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  // ── Admin mode rendering ──────────────────────────────────
  if (isAdminMode) {
    if (!authReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-500">
          Loading…
        </div>
      );
    }

    if (!adminUser) {
      return (
        <AdminLoginView
          onLoginSuccess={(admin) => setAdminUser(admin)}
        />
      );
    }

    // 首次登录强制修改密码
    if (adminUser.mustChangePassword) {
      return (
        <AdminChangePasswordView
          admin={adminUser}
          onSuccess={(updated) => setAdminUser(updated)}
        />
      );
    }

    return (
      <AdminDashboardView
        admin={adminUser}
        onLogout={() => {
          setAdminUser(null);
          adminTokenStore.clear();
        }}
      />
    );
  }

  // ── Mini-app rendering (unchanged below) ──────────────────

  const handleSelectRecipe = (id: string, returnTo: ViewState = "home") => {
    setSelectedRecipeId(id);
    setDetailReturnView(returnTo);
    setCurrentView("detail");
  };

  const handleStartCooking = (recipeId: string, servings: number) => {
    setSelectedRecipeId(recipeId);
    setTargetServings(servings);
    setCurrentView("sop");
  };

  const handleSaveSuccess = () => {
    setEditRecipeId(null);
    setImportedRecipeData(null);
    setCurrentView("home");
  };

  const handleEditRecipe = (id: string) => {
    setEditRecipeId(id);
    setCurrentView("create");
  };

  // Render the current view
  const renderViewContent = () => {
    switch (currentView) {
      case "home":
        return (
          <HomeView
            onSelectRecipe={handleSelectRecipe}
            onNavigate={(v) => setCurrentView(v as ViewState)}
            onAddRecipe={() => setCurrentView("create")}
            onImportRecipe={() => setCurrentView("import")}
          />
        );
      case "detail":
        return selectedRecipeId ? (
          <RecipeDetailView
            recipeId={selectedRecipeId}
            onBack={() => setCurrentView(detailReturnView)}
            onStartCooking={handleStartCooking}
            onEditRecipe={handleEditRecipe}
          />
        ) : null;
      case "create":
        return (
          <CreateRecipeView
            onCancel={() => { setEditRecipeId(null); setImportedRecipeData(null); setCurrentView(editRecipeId ? "detail" : "home"); }}
            onSaveSuccess={() => { setImportedRecipeData(null); handleSaveSuccess(); }}
            editRecipeId={editRecipeId}
            initialData={importedRecipeData}
            onClickImport={() => setCurrentView("import")}
          />
        );
      case "import":
        return (
          <RecipeImportView
            onBack={() => setCurrentView(editRecipeId ? "create" : "home")}
            onConfirm={(recipe) => {
              setImportedRecipeData(recipe);
              setEditRecipeId(null);
              setCurrentView("create");
            }}
          />
        );
      case "sop":
        return selectedRecipeId ? (
          <SopView
            recipeId={selectedRecipeId}
            targetServings={targetServings}
            onExit={() => setCurrentView("detail")}
          />
        ) : null;
      case "timers":
        return <TimerView />;
      case "pantry":
        return <PantryView onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case "discover":
        return <DiscoverView onSelectRecipe={(id) => handleSelectRecipe(id, "discover")} />;
      case "profile":
        return <ProfileView onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case "my-recipes":
        return (
          <MyRecipesView
            onBack={() => setCurrentView("profile")}
            onSelectRecipe={handleSelectRecipe}
          />
        );
      case "shopping-list":
        return (
          <ShoppingListView
            onBack={() => { setShoppingListResult(null); setCurrentView("home"); }}
            onNavigate={(v) => { setShoppingListResult(null); setCurrentView(v as ViewState); }}
            initialResult={shoppingListResult}
          />
        );
      case "meal-plan":
        return (
          <MealPlanView
            onBack={() => setCurrentView("home")}
            onNavigateShoppingResult={(result) => {
              setShoppingListResult(result);
              setCurrentView("shopping-list");
            }}
          />
        );
      case "onboarding":
        return (
          <OnboardingView onComplete={() => setCurrentView("home")} />
        );
      case "help":
        return (
          <HelpCenterView onBack={() => setCurrentView("profile")} />
        );
      default:
        return (
          <HomeView
            onSelectRecipe={handleSelectRecipe}
            onNavigate={(v) => setCurrentView(v as ViewState)}
            onAddRecipe={() => setCurrentView("create")}
          />
        );
    }
  };

  // Check if we should render bottom navigation menu (hide on immersive screens like detail, create, sop)
  const showBottomNav = !["detail", "sop", "create", "my-recipes", "shopping-list", "meal-plan", "onboarding", "help", "import"].includes(currentView);

  const containerClass = "h-screen bg-[#fcf9f8] flex flex-col relative max-w-md mx-auto shadow-2xl border-x border-gray-150/40 overflow-hidden";

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        {t('app.loading')}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Scrollable View Area */}
      <div data-scroll-container className="flex-1 w-full bg-[#fcf9f8] overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: "touch" }}>
        {renderViewContent()}
      </div>

      {/* Floating Capsule Bottom Navigation Menu (Image 3 inspired) */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 w-full z-40 bg-white/94 backdrop-blur-md border-t border-gray-150/50 flex justify-around items-center py-2 px-4 shadow-lg">
          <div className="max-w-md w-full mx-auto flex justify-between items-center h-14">
            <button
              onClick={() => setCurrentView("home")}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                currentView === "home" ? "text-[#ab3500]" : "text-gray-400 hover:text-[#ff6b35]"
              }`}
              aria-label="Home page"
            >
              <Home className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">{t('app.nav.home')}</span>
            </button>

            <button
              onClick={() => setCurrentView("discover")}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                currentView === "discover" ? "text-[#ab3500]" : "text-gray-400 hover:text-[#ff6b35]"
              }`}
              aria-label="Discover feed"
            >
              <Compass className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">{t('app.nav.discover')}</span>
            </button>

            <button
              onClick={() => setCurrentView("timers")}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                currentView === "timers" ? "text-[#ab3500]" : "text-gray-400 hover:text-[#ff6b35]"
              }`}
              aria-label="Cooking timers"
            >
              <Timer className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">{t('app.nav.timers')}</span>
            </button>

            <button
              onClick={() => setCurrentView("pantry")}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                currentView === "pantry" ? "text-[#ab3500]" : "text-gray-400 hover:text-[#ff6b35]"
              }`}
              aria-label="Recipe Pantry"
            >
              <ShieldCheck className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">{t('app.nav.pantry')}</span>
            </button>

            <button
              onClick={() => setCurrentView("profile")}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                currentView === "profile" ? "text-[#ab3500]" : "text-gray-400 hover:text-[#ff6b35]"
              }`}
              aria-label="User Profile"
            >
              <User className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">{t('app.nav.profile')}</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
