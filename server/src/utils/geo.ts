import type {
  Attraction,
  RouteCoordinate,
  RouteSummary,
  TravelMode
} from "../types.js";

const EARTH_RADIUS_KM = 6371;
const TRANSFER_SPEED_KMH: Record<TravelMode, number> = {
  walk: 5,
  car: 30
};

export function haversineKm(a: Attraction, b: Attraction) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(value));
}

export function buildRouteSummary(
  points: Attraction[],
  travelMode: TravelMode = "walk"
): RouteSummary {
  const distance = points.reduce((sum, point, index) => {
    if (index === 0) return 0;
    return sum + haversineKm(points[index - 1], point);
  }, 0);

  const visitDuration = points.reduce(
    (sum, point) => sum + point.durationMinutes,
    0
  );
  const transferDuration = Math.round(
    (distance / TRANSFER_SPEED_KMH[travelMode]) * 60
  );

  return {
    totalDistanceKm: Number(distance.toFixed(2)),
    totalDurationMinutes: visitDuration + transferDuration
  };
}

export function buildDirectGeometry(points: Attraction[]): RouteCoordinate[] {
  return points.map((point) => [point.latitude, point.longitude]);
}

export function optimizeAttractions(points: Attraction[]) {
  if (points.length <= 2) return points;

  const [start, ...rest] = points;
  const optimized = [start];
  const queue = [...rest];

  while (queue.length > 0) {
    const current = optimized[optimized.length - 1];
    let nextIndex = 0;
    let nextDistance = Number.POSITIVE_INFINITY;

    queue.forEach((candidate, index) => {
      const distance = haversineKm(current, candidate);
      if (distance < nextDistance) {
        nextDistance = distance;
        nextIndex = index;
      }
    });

    optimized.push(queue.splice(nextIndex, 1)[0]);
  }

  return optimized;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}
