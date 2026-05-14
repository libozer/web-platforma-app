import { findAttractionsByIds } from "../repositories/attractionRepository.js";
import { createRoute } from "../repositories/routeRepository.js";
import type { Attraction, TravelMode } from "../types.js";
import { buildRoutedPath } from "./openRouteService.js";
import { ApiError } from "../utils/http.js";
import { optimizeAttractions } from "../utils/geo.js";

export async function buildRoutePreview(
  attractionIds: string[],
  shouldOptimize = true,
  travelMode: TravelMode = "walk"
) {
  const attractions = await resolveAttractions(attractionIds);
  const points = shouldOptimize ? optimizeAttractions(attractions) : attractions;
  const route = await buildRoutedPath(points, travelMode);

  return { points, ...route };
}

export async function saveRoute(input: {
  userId: string;
  name: string;
  description?: string;
  routeDate?: string;
  isPublic?: boolean;
  attractionIds: string[];
  optimize?: boolean;
  travelMode?: TravelMode;
}) {
  const preview = await buildRoutePreview(
    input.attractionIds,
    input.optimize,
    input.travelMode
  );

  return createRoute({
    userId: input.userId,
    name: input.name,
    description: input.description,
    routeDate: input.routeDate,
    isPublic: input.isPublic,
    points: preview.points,
    summary: preview.summary
  });
}

async function resolveAttractions(attractionIds: string[]): Promise<Attraction[]> {
  if (attractionIds.length < 2) {
    throw new ApiError(400, "Для маршрута нужно выбрать минимум две точки");
  }

  const uniqueIds = Array.from(new Set(attractionIds));
  const attractions = await findAttractionsByIds(uniqueIds);

  if (attractions.length !== uniqueIds.length) {
    throw new ApiError(404, "Одна или несколько точек маршрута не найдены");
  }

  return attractions;
}
