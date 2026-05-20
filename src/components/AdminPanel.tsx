import { MapPin, RefreshCw, Route, Trash2, UsersRound } from "lucide-react";
import { formatDistance, formatDuration } from "../lib/format";
import type { AdminRouteWithOwner, AdminUserSummary } from "../types";

interface AdminPanelProps {
  users: AdminUserSummary[];
  routes: AdminRouteWithOwner[];
  selectedUserId: string;
  loading: boolean;
  onSelectUser: (userId: string) => void;
  onRefresh: () => void;
  onDeleteRoute: (routeId: string) => void;
}

export function AdminPanel({
  users,
  routes,
  selectedUserId,
  loading,
  onSelectUser,
  onRefresh,
  onDeleteRoute
}: AdminPanelProps) {
  const routeCount = users.reduce((sum, user) => sum + user.routeCount, 0);

  return (
    <section className="workspace-panel admin-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Администрирование</p>
          <h2>Пользователи и маршруты</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          title="Обновить данные"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="admin-stats">
        <span>
          <strong>{users.length}</strong>
          пользователей
        </span>
        <span>
          <strong>{routeCount}</strong>
          маршрутов
        </span>
        <span>
          <strong>{routes.length}</strong>
          показано
        </span>
      </div>

      <div className="admin-layout">
        <aside className="admin-users" aria-label="Пользователи">
          <button
            type="button"
            className={!selectedUserId ? "admin-user active" : "admin-user"}
            onClick={() => onSelectUser("")}
          >
            <UsersRound size={18} />
            <span>
              <strong>Все пользователи</strong>
              <small>{routeCount} маршрутов</small>
            </span>
          </button>

          {users.map((user) => (
            <button
              type="button"
              key={user.id}
              className={
                selectedUserId === user.id ? "admin-user active" : "admin-user"
              }
              onClick={() => onSelectUser(user.id)}
            >
              <span className="avatar-badge">{user.name.slice(0, 1)}</span>
              <span>
                <strong>{user.name}</strong>
                <small>
                  {user.email} · {user.routeCount} маршрутов
                </small>
              </span>
            </button>
          ))}
        </aside>

        <div className="admin-routes">
          {routes.length === 0 ? (
            <div className="empty-state compact">
              <Route size={30} />
              <h3>Маршрутов нет</h3>
              <p>У выбранного пользователя пока нет сохранённых маршрутов.</p>
            </div>
          ) : (
            routes.map((route) => (
              <article className="route-card admin-route-card" key={route.id}>
                <div>
                  <h3>{route.name}</h3>
                  <p>{route.description || "Пользовательский маршрут"}</p>
                </div>

                <div className="owner-line">
                  <strong>{route.owner.name}</strong>
                  <span>{route.owner.email}</span>
                </div>

                <div className="metric-row">
                  <span>
                    <MapPin size={16} />
                    {route.points.length} точек
                  </span>
                  <span>{formatDistance(route.totalDistanceKm)}</span>
                  <span>{formatDuration(route.totalDurationMinutes)}</span>
                </div>

                <ol className="mini-route">
                  {route.points.map((point) => (
                    <li key={point.id ?? point.position}>
                      {point.position}. {point.attraction.name}
                    </li>
                  ))}
                </ol>

                <div className="route-actions">
                  <span className="status-pill">
                    {new Date(route.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                  <button
                    type="button"
                    className="danger-button"
                    title="Удалить маршрут"
                    onClick={() => onDeleteRoute(route.id)}
                    disabled={loading}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
