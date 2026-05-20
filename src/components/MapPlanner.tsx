import { FormEvent, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  Car,
  Check,
  Footprints,
  MapPinned,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import { budgetLabels, categoryLabels, categoryOptions } from "../lib/labels";
import { formatDistance, formatDuration } from "../lib/format";
import type {
  Attraction,
  RecommendationPayload,
  RoutePreview,
  TravelMode
} from "../types";

interface MapPlannerProps {
  attractions: Attraction[];
  selectedIds: string[];
  optimize: boolean;
  routeMode: TravelMode;
  preview: RoutePreview | null;
  recommendations: RecommendationPayload | null;
  loading: boolean;
  onToggleAttraction: (attractionId: string) => void;
  onRemoveAttraction: (attractionId: string) => void;
  onUseRecommendation: (attractionIds: string[]) => void;
  onRefreshRecommendations: () => void;
  onOptimizeChange: (value: boolean) => void;
  onRouteModeChange: (value: TravelMode) => void;
  onSaveRoute: (input: {
    name: string;
    description?: string;
    routeDate?: string;
    optimize: boolean;
    travelMode: TravelMode;
  }) => void;
}

const belarusCenter: [number, number] = [53.7, 27.9];

export function MapPlanner({
  attractions,
  selectedIds,
  optimize,
  routeMode,
  preview,
  recommendations,
  loading,
  onToggleAttraction,
  onRemoveAttraction,
  onUseRecommendation,
  onRefreshRecommendations,
  onOptimizeChange,
  onRouteModeChange,
  onSaveRoute
}: MapPlannerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [routeName, setRouteName] = useState("Маршрут по Беларуси");
  const [routeDate, setRouteDate] = useState("");

  const selectedAttractions = useMemo(
    () =>
      selectedIds
        .map((id) => attractions.find((attraction) => attraction.id === id))
        .filter(Boolean) as Attraction[],
    [attractions, selectedIds]
  );

  const visibleAttractions = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return attractions.filter((attraction) => {
      const categoryMatches =
        category === "all" || attraction.category === category;
      const searchMatches =
        !lowered ||
        attraction.name.toLowerCase().includes(lowered) ||
        attraction.description.toLowerCase().includes(lowered) ||
        attraction.tags.join(" ").toLowerCase().includes(lowered);

      return categoryMatches && searchMatches;
    });
  }, [attractions, category, search]);

  const routePoints = useMemo(
    () => preview?.points ?? selectedAttractions,
    [preview?.points, selectedAttractions]
  );
  const routePositions = useMemo(
    () =>
      routePoints.map(
        (point) => [point.latitude, point.longitude] as [number, number]
      ),
    [routePoints]
  );
  const routeLinePositions = useMemo(
    () => (preview?.geometry.length ? preview.geometry : routePositions),
    [preview?.geometry, routePositions]
  );
  const routeLineColor = routeMode === "car" ? "#2563eb" : "#16a34a";

  const allAttractionPositions = useMemo(
    () =>
      attractions.map(
        (attraction) =>
          [attraction.latitude, attraction.longitude] as [number, number]
      ),
    [attractions]
  );
  const mapViewPositions = useMemo(
    () =>
      routeLinePositions.length > 0
        ? routeLinePositions
        : allAttractionPositions,
    [allAttractionPositions, routeLinePositions]
  );
  const center = mapViewPositions[0] ?? belarusCenter;
  const initialZoom = selectedIds.length ? 12 : 7;

  function submitRoute(event: FormEvent) {
    event.preventDefault();
    onSaveRoute({
      name: routeName,
      routeDate: routeDate || undefined,
      optimize,
      travelMode: routeMode,
      description: `${
        routeMode === "car" ? "Автомобильный" : "Пешеходный"
      } маршрут из ${selectedIds.length} туристических объектов`
    });
  }

  return (
    <section className="planner-layout">
      <aside className="planner-sidebar">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Карта маршрута</p>
            <h2>Конструктор поездки</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            title="Обновить рекомендации"
            onClick={onRefreshRecommendations}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="toolbar-row">
          <label className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск объекта"
            />
          </label>
          <label className="filter-field">
            <SlidersHorizontal size={17} />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">Все</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {recommendations && (
          <article className="recommendation-strip">
            <div>
              <span>Рекомендовано</span>
              <strong>{recommendations.generatedRoute.name}</strong>
              <p>{recommendations.generatedRoute.description}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUseRecommendation(
                  recommendations.generatedRoute.points.map((point) => point.id)
                )
              }
            >
              Взять
            </button>
          </article>
        )}

        <div className="attraction-list" aria-label="Туристические объекты">
          {visibleAttractions.map((attraction) => {
            const selected = selectedIds.includes(attraction.id);
            return (
              <article className="attraction-card" key={attraction.id}>
                <img src={attraction.imageUrl ?? ""} alt="" />
                <div>
                  <div className="card-title-row">
                    <h3>{attraction.name}</h3>
                    <button
                      type="button"
                      className={selected ? "icon-button selected" : "icon-button"}
                      title={selected ? "Убрать из маршрута" : "Добавить в маршрут"}
                      onClick={() => onToggleAttraction(attraction.id)}
                    >
                      {selected ? <Check size={17} /> : <Plus size={17} />}
                    </button>
                  </div>
                  <p>{attraction.description}</p>
                  <div className="tag-row">
                    <span>{categoryLabels[attraction.category]}</span>
                    <span>{formatDuration(attraction.durationMinutes)}</span>
                    <span>{budgetLabels[attraction.budgetLevel]}</span>
                    <span>{attraction.rating.toFixed(1)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </aside>

      <div className="map-workspace">
        <div className="map-surface">
          <MapContainer center={center} zoom={initialZoom} scrollWheelZoom className="map">
            <MapAutoView positions={mapViewPositions} />
            <MapAttributionCleaner />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {attractions.map((attraction) => {
              const selected = selectedIds.includes(attraction.id);
              return (
                <Marker
                  key={attraction.id}
                  position={[attraction.latitude, attraction.longitude]}
                  icon={makeMarkerIcon(selected)}
                  eventHandlers={{
                    click: () => onToggleAttraction(attraction.id)
                  }}
                >
                  <Popup>
                    <strong>{attraction.name}</strong>
                    <br />
                    {categoryLabels[attraction.category]}
                  </Popup>
                </Marker>
              );
            })}
            {routeLinePositions.length >= 2 && (
              <Polyline
                positions={routeLinePositions}
                pathOptions={{ color: routeLineColor, weight: 5, opacity: 0.86 }}
              />
            )}
          </MapContainer>
        </div>

        <form className="route-dock" onSubmit={submitRoute}>
          <div className="route-dock-header">
            <div>
              <p className="eyebrow">Текущий маршрут</p>
              <h2>{routeName}</h2>
            </div>
            <MapPinned size={24} />
          </div>

          <div className="route-inputs">
            <label>
              Название
              <input
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
                required
              />
            </label>
            <label>
              Дата
              <input
                type="date"
                value={routeDate}
                onChange={(event) => setRouteDate(event.target.value)}
              />
            </label>
            <div
              className="route-mode-toggle"
              role="group"
              aria-label="Способ передвижения"
            >
              <button
                type="button"
                className={routeMode === "walk" ? "active" : ""}
                onClick={() => onRouteModeChange("walk")}
              >
                <Footprints size={17} />
                Пешком
              </button>
              <button
                type="button"
                className={routeMode === "car" ? "active" : ""}
                onClick={() => onRouteModeChange("car")}
              >
                <Car size={17} />
                На машине
              </button>
            </div>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={optimize}
                onChange={(event) => onOptimizeChange(event.target.checked)}
              />
              Оптимизировать порядок
            </label>
          </div>

          <div className="summary-grid">
            <span>
              <strong>{selectedIds.length}</strong>
              точек
            </span>
            <span>
              <strong>
                {preview ? formatDistance(preview.summary.totalDistanceKm) : "0 км"}
              </strong>
              дистанция
            </span>
            <span>
              <strong>
                {preview
                  ? formatDuration(preview.summary.totalDurationMinutes)
                  : "0 мин"}
              </strong>
              время
            </span>
          </div>

          <ol className="selected-route">
            {routePoints.map((point, index) => (
              <li key={point.id}>
                <span>{index + 1}</span>
                <div>
                  <strong>{point.name}</strong>
                  <small>{categoryLabels[point.category]}</small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  title="Убрать точку"
                  onClick={() => onRemoveAttraction(point.id)}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ol>

          <button
            className="primary-button"
            type="submit"
            disabled={selectedIds.length < 2 || loading}
          >
            <Save size={18} />
            {loading ? "Сохранение..." : "Сохранить маршрут"}
          </button>
        </form>
      </div>
    </section>
  );
}

function MapAutoView({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions), {
        padding: [36, 36],
        maxZoom: 13
      });
      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], 12);
      return;
    }

    map.setView(belarusCenter, 7);
  }, [map, positions]);

  return null;
}

function MapAttributionCleaner() {
  const map = useMap();

  useEffect(() => {
    map.attributionControl.setPrefix(false);
  }, [map]);

  return null;
}

function makeMarkerIcon(selected: boolean) {
  return L.divIcon({
    className: selected ? "route-marker selected" : "route-marker",
    html: `<span></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}
