import { MapPin, Route, Trash2 } from "lucide-react";
import { formatDistance, formatDuration } from "../lib/format";
import type { RouteWithPoints } from "../types";

interface SavedRoutesProps {
  routes: RouteWithPoints[];
  onOpenRoute: (route: RouteWithPoints) => void;
  onDeleteRoute: (routeId: string) => void;
}

export function SavedRoutes({
  routes,
  onOpenRoute,
  onDeleteRoute
}: SavedRoutesProps) {
  return (
    <section className="workspace-panel saved-routes">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Мои маршруты</p>
          <h2>Сохранённые планы</h2>
        </div>
        <span className="status-pill">{routes.length}</span>
      </div>

      {routes.length === 0 ? (
        <div className="empty-state">
          <Route size={34} />
          <h3>Маршрутов пока нет</h3>
          <p>Соберите маршрут на карте и сохраните его в профиль.</p>
        </div>
      ) : (
        <div className="route-list">
          {routes.map((route) => (
            <article className="route-card" key={route.id}>
              <div>
                <h3>{route.name}</h3>
                <p>{route.description || "Пользовательский маршрут"}</p>
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
                <button type="button" onClick={() => onOpenRoute(route)}>
                  Открыть на карте
                </button>
                <button
                  type="button"
                  className="danger-button"
                  title="Удалить маршрут"
                  onClick={() => onDeleteRoute(route.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
