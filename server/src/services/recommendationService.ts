import type {
  Attraction,
  BudgetLevel,
  RouteSummary,
  UserPreferences
} from "../types.js";
import {
  buildRouteSummary,
  haversineKm,
  optimizeAttractions
} from "../utils/geo.js";

const budgetRank: Record<BudgetLevel, number> = {
  free: 0,
  low: 1,
  mid: 2,
  high: 3
};

const knownCountryTags = [
  "беларусь",
  "польша",
  "германия",
  "франция",
  "испания",
  "италия",
  "австрия",
  "греция",
  "швейцария",
  "чехия"
];

const neighboringCountries: Record<string, string[]> = {
  беларусь: ["польша"],
  польша: ["беларусь", "германия", "чехия"],
  германия: ["польша", "чехия", "австрия", "швейцария", "франция"],
  франция: ["германия", "швейцария", "италия", "испания"],
  испания: ["франция"],
  италия: ["франция", "швейцария", "австрия"],
  австрия: ["германия", "чехия", "швейцария", "италия"],
  чехия: ["германия", "польша", "австрия"],
  швейцария: ["франция", "германия", "австрия", "италия"],
  греция: []
};

const belarusCities = new Set([
  "Минск",
  "Мир",
  "Несвиж",
  "Брест",
  "Каменюки",
  "Полоцк",
  "Лида",
  "Логойский район",
  "Гомель",
  "Гродненский район",
  "Браслав",
  "Гродно",
  "Витебск",
  "Бобруйск",
  "Могилёв",
  "Волковыск"
]);

const minRecommendedRoutePoints = 3;
const maxRecommendedRoutePoints = 5;
const routeCandidateLimit = 42;
const routeVariantPoolSize = 14;

interface RecommendationOptions {
  variant?: number;
}

interface CandidateRoute {
  points: ScoredAttraction[];
  summary: RouteSummary;
  score: number;
}

export interface ScoredAttraction extends Attraction {
  score: number;
  reason: string;
}

export function buildRecommendations(
  attractions: Attraction[],
  preferences: UserPreferences,
  options: RecommendationOptions = {}
) {
  const scored = attractions
    .map((attraction) => scoreAttraction(attraction, preferences))
    .sort((a, b) => b.score - a.score);

  const routePoints = pickRoutePoints(
    scored,
    preferences,
    normalizeVariant(options.variant)
  );
  const optimizedRoutePoints = optimizeAttractions(routePoints);
  const summary = buildRouteSummary(optimizedRoutePoints);

  return {
    attractions: scored.slice(0, 8),
    generatedRoute: {
      name: buildRouteName(optimizedRoutePoints),
      description: buildRouteDescription(preferences, summary, optimizedRoutePoints),
      points: optimizedRoutePoints,
      summary
    }
  };
}

function scoreAttraction(
  attraction: Attraction,
  preferences: UserPreferences
): ScoredAttraction {
  const interestScore = preferences.interests.includes(attraction.category)
    ? 36
    : hasTagMatch(attraction, preferences.interests)
      ? 18
      : 0;
  const budgetScore =
    budgetRank[attraction.budgetLevel] <= budgetRank[preferences.budget]
      ? 18
      : -10;
  const paceScore = getPaceScore(attraction.durationMinutes, preferences.pace);
  const ratingScore = attraction.rating * 8;
  const score = Math.round(interestScore + budgetScore + paceScore + ratingScore);

  return {
    ...attraction,
    score,
    reason: buildReason(attraction, interestScore, budgetScore)
  };
}

function pickRoutePoints(
  scored: ScoredAttraction[],
  preferences: UserPreferences,
  variant: number
) {
  if (scored.length <= maxRecommendedRoutePoints) {
    return scored;
  }

  const candidates = buildRouteCandidates(scored, preferences);
  const selectable = candidates.length
    ? candidates.slice(0, Math.min(routeVariantPoolSize, candidates.length))
    : [buildFallbackRoute(scored, preferences, variant)];
  const index = variant % selectable.length;

  return selectable[index].points;
}

function buildRouteCandidates(
  scored: ScoredAttraction[],
  preferences: UserPreferences
) {
  const uniqueCandidates = new Map<string, CandidateRoute>();
  const anchors = scored.slice(0, Math.min(routeCandidateLimit, scored.length));

  for (const anchor of anchors) {
    const nearby = scored
      .filter((candidate) => candidate.id !== anchor.id)
      .map((candidate) => ({
        candidate,
        distanceFromAnchor: haversineKm(anchor, candidate)
      }))
      .filter(
        ({ candidate, distanceFromAnchor }) =>
          distanceFromAnchor <= getClusterRadiusKm(preferences.pace) &&
          canShareRecommendationArea(anchor, candidate)
      )
      .sort(
        (a, b) =>
          b.candidate.score -
          b.distanceFromAnchor * 0.18 -
          (a.candidate.score - a.distanceFromAnchor * 0.18)
      );

    const selected: ScoredAttraction[] = [anchor];

    for (const { candidate } of nearby) {
      if (selected.length >= maxRecommendedRoutePoints) break;
      if (!keepsRouteCompact(selected, candidate, preferences)) continue;
      selected.push(candidate);
    }

    if (selected.length < minRecommendedRoutePoints) continue;

    const optimized = optimizeAttractions(selected);
    const summary = buildRouteSummary(optimized);
    const candidateRoute = {
      points: selected,
      summary,
      score: scoreRoute(selected, summary)
    };
    const key = makeRouteKey(selected);
    const existing = uniqueCandidates.get(key);

    if (!existing || candidateRoute.score > existing.score) {
      uniqueCandidates.set(key, candidateRoute);
    }
  }

  return Array.from(uniqueCandidates.values()).sort((a, b) => b.score - a.score);
}

function keepsRouteCompact(
  selected: ScoredAttraction[],
  candidate: ScoredAttraction,
  preferences: UserPreferences
) {
  const closestSelectedDistance = Math.min(
    ...selected.map((point) => haversineKm(point, candidate))
  );

  if (closestSelectedDistance > getNeighborDistanceKm(preferences.pace)) {
    return false;
  }

  const optimized = optimizeAttractions([...selected, candidate]);
  const summary = buildRouteSummary(optimized);

  if (summary.totalDistanceKm > getTotalDistanceLimitKm(preferences.pace)) {
    return false;
  }

  if (
    selected.length + 1 >= minRecommendedRoutePoints &&
    summary.totalDurationMinutes > preferences.maxDuration
  ) {
    return false;
  }

  return true;
}

function buildFallbackRoute(
  scored: ScoredAttraction[],
  preferences: UserPreferences,
  variant: number
): CandidateRoute {
  const anchors = scored.slice(0, Math.min(routeCandidateLimit, scored.length));
  const anchor = anchors[variant % anchors.length] ?? scored[0];
  const points = [anchor];
  const closest = scored
    .filter((candidate) => candidate.id !== anchor.id)
    .filter((candidate) => canShareRecommendationArea(anchor, candidate))
    .sort((a, b) => haversineKm(anchor, a) - haversineKm(anchor, b));

  for (const candidate of closest) {
    if (points.length >= maxRecommendedRoutePoints) break;
    if (
      points.length >= 2 ||
      haversineKm(anchor, candidate) <= getClusterRadiusKm(preferences.pace)
    ) {
      points.push(candidate);
    }
  }

  const optimized = optimizeAttractions(points);
  const summary = buildRouteSummary(optimized);

  return {
    points,
    summary,
    score: scoreRoute(points, summary)
  };
}

function scoreRoute(points: ScoredAttraction[], summary: RouteSummary) {
  const averageScore =
    points.reduce((sum, point) => sum + point.score, 0) / points.length;
  const categoryCount = new Set(points.map((point) => point.category)).size;
  const cityCount = new Set(points.map((point) => point.city)).size;

  return (
    averageScore +
    points.length * 8 +
    categoryCount * 3 +
    Math.min(cityCount, 3) * 2 -
    summary.totalDistanceKm * 0.35
  );
}

function getClusterRadiusKm(pace: UserPreferences["pace"]) {
  if (pace === "calm") return 35;
  if (pace === "active") return 140;
  return 80;
}

function getNeighborDistanceKm(pace: UserPreferences["pace"]) {
  if (pace === "calm") return 14;
  if (pace === "active") return 70;
  return 32;
}

function getTotalDistanceLimitKm(pace: UserPreferences["pace"]) {
  if (pace === "calm") return 22;
  if (pace === "active") return 95;
  return 48;
}

function canShareRecommendationArea(anchor: Attraction, candidate: Attraction) {
  const anchorCountry = getCountry(anchor);
  const candidateCountry = getCountry(candidate);

  if (!anchorCountry || !candidateCountry) return true;
  if (anchorCountry === candidateCountry) return true;

  return neighboringCountries[anchorCountry]?.includes(candidateCountry) ?? false;
}

function getCountry(attraction: Attraction) {
  const countryFromTags = attraction.tags.find((tag) =>
    knownCountryTags.includes(tag)
  );

  if (countryFromTags) return countryFromTags;
  if (belarusCities.has(attraction.city)) return "беларусь";

  return null;
}

function makeRouteKey(points: Attraction[]) {
  return points
    .map((point) => point.id)
    .sort()
    .join(":");
}

function normalizeVariant(variant = 0) {
  return Number.isFinite(variant) ? Math.max(0, Math.floor(variant)) : 0;
}

function getPaceScore(duration: number, pace: UserPreferences["pace"]) {
  if (pace === "calm") return duration <= 80 ? 14 : 0;
  if (pace === "active") return duration >= 60 ? 12 : 4;
  return duration <= 120 ? 10 : 2;
}

function hasTagMatch(attraction: Attraction, interests: string[]) {
  return attraction.tags.some((tag) => interests.includes(tag));
}

function buildReason(
  attraction: Attraction,
  interestScore: number,
  budgetScore: number
) {
  const parts = [];
  if (interestScore > 0) parts.push("совпадает с интересами");
  if (budgetScore > 0) parts.push("подходит по бюджету");
  if (attraction.rating >= 4.7) parts.push("высокий рейтинг");
  return parts.join(", ") || "хорошо дополняет маршрут";
}

function buildRouteName(points: Attraction[]) {
  const cities = Array.from(new Set(points.map((point) => point.city)));
  if (cities.length === 0) return "Персональный маршрут";
  if (cities.length === 1) return `Персональный маршрут: ${cities[0]}`;
  return `Персональный маршрут: ${cities.slice(0, 2).join(" - ")}`;
}

function buildRouteDescription(
  preferences: UserPreferences,
  summary: RouteSummary,
  points: Attraction[]
) {
  const hours = Math.floor(summary.totalDurationMinutes / 60);
  const minutes = summary.totalDurationMinutes % 60;
  const cities = Array.from(new Set(points.map((point) => point.city))).join(", ");

  return `Компактный маршрут по региону ${cities}: точки подобраны по интересам, бюджету и темпу "${preferences.pace}". Примерная длительность: ${hours} ч ${minutes} мин.`;
}
