import { config } from "../config.js";
import type {
  Attraction,
  RouteCoordinate,
  RoutePreview,
  RouteSummary,
  TravelMode
} from "../types.js";
import { buildDirectGeometry, buildRouteSummary } from "../utils/geo.js";

const ORS_PROFILE: Record<TravelMode, string> = {
  car: "driving-car",
  walk: "foot-walking"
};

interface OrsResponse {
  features?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
    properties?: {
      summary?: {
        distance?: number;
        duration?: number;
      };
    };
  }>;
}

export async function buildRoutedPath(
  points: Attraction[],
  travelMode: TravelMode
): Promise<Omit<RoutePreview, "points">> {
  if (!config.openRouteServiceApiKey) {
    return buildDirectPath(points, travelMode);
  }

  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/${ORS_PROFILE[travelMode]}/geojson`,
      {
        method: "POST",
        headers: {
          Authorization: config.openRouteServiceApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coordinates: points.map((point) => [point.longitude, point.latitude]),
          instructions: false
        })
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouteService returned ${response.status}`);
    }

    const payload = (await response.json()) as OrsResponse;
    const feature = payload.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    const summary = feature?.properties?.summary;

    if (!coordinates?.length || !summary?.distance || !summary.duration) {
      throw new Error("OpenRouteService returned an incomplete route");
    }

    return {
      geometry: toLeafletCoordinates(coordinates),
      summary: buildOrsSummary(points, summary.distance, summary.duration),
      travelMode,
      routingProvider: "openrouteservice"
    };
  } catch (error) {
    console.warn("OpenRouteService недоступен, используется прямой маршрут", error);
    return buildDirectPath(points, travelMode);
  }
}

function buildDirectPath(
  points: Attraction[],
  travelMode: TravelMode
): Omit<RoutePreview, "points"> {
  return {
    geometry: buildDirectGeometry(points),
    summary: buildRouteSummary(points, travelMode),
    travelMode,
    routingProvider: "direct"
  };
}

function buildOrsSummary(
  points: Attraction[],
  distanceMeters: number,
  durationSeconds: number
): RouteSummary {
  const visitDuration = points.reduce(
    (sum, point) => sum + point.durationMinutes,
    0
  );

  return {
    totalDistanceKm: Number((distanceMeters / 1000).toFixed(2)),
    totalDurationMinutes: visitDuration + Math.round(durationSeconds / 60)
  };
}

function toLeafletCoordinates(
  coordinates: Array<[number, number]>
): RouteCoordinate[] {
  return coordinates.map(([longitude, latitude]) => [latitude, longitude]);
}
