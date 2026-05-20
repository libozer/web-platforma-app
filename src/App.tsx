import { useEffect, useMemo, useState } from "react";
import {
  Compass,
  LogOut,
  Map,
  Route,
  ShieldCheck,
  UserRound,
  WifiOff
} from "lucide-react";
import {
  clearStoredToken,
  getAdminRoutes,
  getAdminUsers,
  getAttractions,
  getProfile,
  getRecommendations,
  getRoutes,
  getStoredToken,
  previewRoute,
  removeAdminRoute,
  removeRoute,
  saveRoute,
  updateProfile
} from "./lib/api";
import { AdminPanel } from "./components/AdminPanel";
import { AuthPanel } from "./components/AuthPanel";
import { MapPlanner } from "./components/MapPlanner";
import { ProfilePanel } from "./components/ProfilePanel";
import { SavedRoutes } from "./components/SavedRoutes";
import type {
  AdminRouteWithOwner,
  AdminUserSummary,
  Attraction,
  RecommendationPayload,
  RoutePreview,
  RouteWithPoints,
  TravelMode,
  User,
  UserPreferences
} from "./types";

type View = "planner" | "profile" | "routes" | "admin";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("planner");
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [recommendations, setRecommendations] =
    useState<RecommendationPayload | null>(null);
  const [routes, setRoutes] = useState<RouteWithPoints[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserSummary[]>([]);
  const [adminRoutes, setAdminRoutes] = useState<AdminRouteWithOwner[]>([]);
  const [adminUserId, setAdminUserId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [optimize, setOptimize] = useState(true);
  const [routeMode, setRouteMode] = useState<TravelMode>("walk");
  const [preview, setPreview] = useState<RoutePreview | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedKey = useMemo(() => selectedIds.join(","), [selectedIds]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setInitializing(false);
      return;
    }

    getProfile()
      .then(({ user: profile }) => setUser(profile))
      .catch(() => {
        clearStoredToken();
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadWorkspace();
  }, [user?.id]);

  useEffect(() => {
    if (user?.role !== "admin" || view !== "admin") return;
    loadAdminWorkspace();
  }, [user?.role, view, adminUserId]);

  useEffect(() => {
    if (selectedIds.length < 2) {
      setPreview(null);
      return;
    }

    let active = true;
    previewRoute({ attractionIds: selectedIds, optimize, travelMode: routeMode })
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((caught) => {
        if (active) setError(getErrorMessage(caught));
      });

    return () => {
      active = false;
    };
  }, [selectedKey, optimize, routeMode]);

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const [attractionPayload, recommendationPayload, routePayload] =
        await Promise.all([
          getAttractions({}),
          getRecommendations(),
          getRoutes()
        ]);
      setAttractions(attractionPayload.attractions);
      setRecommendations(recommendationPayload);
      setRoutes(routePayload.routes);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminWorkspace() {
    setLoading(true);
    setError("");
    try {
      const [userPayload, routePayload] = await Promise.all([
        getAdminUsers(),
        getAdminRoutes(adminUserId || undefined)
      ]);
      setAdminUsers(userPayload.users);
      setAdminRoutes(routePayload.routes);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function refreshRecommendations() {
    setLoading(true);
    setError("");
    try {
      setRecommendations(await getRecommendations());
      setNotice("Рекомендации обновлены");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  function toggleAttraction(attractionId: string) {
    setSelectedIds((current) =>
      current.includes(attractionId)
        ? current.filter((id) => id !== attractionId)
        : [...current, attractionId]
    );
  }

  async function handleSaveRoute(input: {
    name: string;
    description?: string;
    routeDate?: string;
    optimize: boolean;
    travelMode: TravelMode;
  }) {
    setLoading(true);
    setError("");
    try {
      const payload = await saveRoute({
        ...input,
        attractionIds: selectedIds
      });
      setRoutes((current) => [payload.route, ...current]);
      setNotice("Маршрут сохранён в профиле");
      setView("routes");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSave(input: {
    name: string;
    preferences: UserPreferences;
  }) {
    setLoading(true);
    setError("");
    try {
      const payload = await updateProfile(input);
      setUser(payload.user);
      setRecommendations(await getRecommendations());
      setNotice("Профиль обновлён");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRoute(routeId: string) {
    setLoading(true);
    setError("");
    try {
      await removeRoute(routeId);
      setRoutes((current) => current.filter((route) => route.id !== routeId));
      setNotice("Маршрут удалён");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminDeleteRoute(routeId: string) {
    setLoading(true);
    setError("");
    try {
      await removeAdminRoute(routeId);
      setAdminRoutes((current) =>
        current.filter((route) => route.id !== routeId)
      );
      setRoutes((current) => current.filter((route) => route.id !== routeId));
      const [userPayload, routePayload] = await Promise.all([
        getAdminUsers(),
        getAdminRoutes(adminUserId || undefined)
      ]);
      setAdminUsers(userPayload.users);
      setAdminRoutes(routePayload.routes);
      setNotice("Маршрут удалён администратором");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  function openRoute(route: RouteWithPoints) {
    setSelectedIds(route.points.map((point) => point.attraction.id));
    setView("planner");
  }

  function logout() {
    clearStoredToken();
    setUser(null);
    setSelectedIds([]);
    setRecommendations(null);
    setRoutes([]);
    setAdminUsers([]);
    setAdminRoutes([]);
    setAdminUserId("");
    setView("planner");
  }

  if (initializing) {
    return (
      <main className="loading-screen">
        <Compass size={34} />
        <span>Загрузка платформы...</span>
      </main>
    );
  }

  if (!user) {
    return <AuthPanel onAuthenticated={setUser} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark compact-brand">
          <Compass size={25} />
          <div>
            <strong>Tourist</strong>
            <span>{user.name}</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Основная навигация">
          <button
            className={view === "planner" ? "active" : ""}
            type="button"
            onClick={() => setView("planner")}
          >
            <Map size={18} />
            Карта
          </button>
          <button
            className={view === "routes" ? "active" : ""}
            type="button"
            onClick={() => setView("routes")}
          >
            <Route size={18} />
            Маршруты
          </button>
          <button
            className={view === "profile" ? "active" : ""}
            type="button"
            onClick={() => setView("profile")}
          >
            <UserRound size={18} />
            Профиль
          </button>
          {user.role === "admin" && (
            <button
              className={view === "admin" ? "active" : ""}
              type="button"
              onClick={() => setView("admin")}
            >
              <ShieldCheck size={18} />
              Админ
            </button>
          )}
        </nav>

        <button
          type="button"
          className="icon-button"
          title="Выйти"
          onClick={logout}
        >
          <LogOut size={19} />
        </button>
      </header>

      {(error || notice) && (
        <div className={error ? "toast error" : "toast"}>
          {error && <WifiOff size={18} />}
          <span>{error || notice}</span>
          <button
            type="button"
            className="icon-button"
            title="Закрыть сообщение"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            ×
          </button>
        </div>
      )}

      {view === "planner" && (
        <MapPlanner
          attractions={attractions}
          selectedIds={selectedIds}
          optimize={optimize}
          routeMode={routeMode}
          preview={preview}
          recommendations={recommendations}
          loading={loading}
          onToggleAttraction={toggleAttraction}
          onRemoveAttraction={(id) =>
            setSelectedIds((current) => current.filter((item) => item !== id))
          }
          onUseRecommendation={setSelectedIds}
          onRefreshRecommendations={refreshRecommendations}
          onOptimizeChange={setOptimize}
          onRouteModeChange={setRouteMode}
          onSaveRoute={handleSaveRoute}
        />
      )}

      {view === "profile" && (
        <ProfilePanel
          user={user}
          saving={loading}
          onSave={handleProfileSave}
        />
      )}

      {view === "routes" && (
        <SavedRoutes
          routes={routes}
          onOpenRoute={openRoute}
          onDeleteRoute={handleDeleteRoute}
        />
      )}

      {view === "admin" && user.role === "admin" && (
        <AdminPanel
          users={adminUsers}
          routes={adminRoutes}
          selectedUserId={adminUserId}
          loading={loading}
          onSelectUser={setAdminUserId}
          onRefresh={loadAdminWorkspace}
          onDeleteRoute={handleAdminDeleteRoute}
        />
      )}
    </main>
  );
}

function getErrorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "Неизвестная ошибка";
}

export default App;
