import type {
  Attraction,
  BudgetLevel,
  RouteSummary,
  UserPreferences
} from "../types.js";
import { buildRouteSummary, optimizeAttractions } from "../utils/geo.js";

const budgetRank: Record<BudgetLevel, number> = {
  free: 0,
  low: 1,
  mid: 2,
  high: 3
};

export interface ScoredAttraction extends Attraction {
  score: number;
  reason: string;
}

export function buildRecommendations(
  attractions: Attraction[],
  preferences: UserPreferences
) {
  const scored = attractions
    .map((attraction) => scoreAttraction(attraction, preferences))
    .sort((a, b) => b.score - a.score);

  const routePoints = pickRoutePoints(scored, preferences);
  const optimizedRoutePoints = optimizeAttractions(routePoints);
  const summary = buildRouteSummary(optimizedRoutePoints);

  return {
    attractions: scored.slice(0, 8),
    generatedRoute: {
      name: "Персональный маршрут",
      description: buildRouteDescription(preferences, summary),
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
  attractions: ScoredAttraction[],
  preferences: UserPreferences
) {
  const selected: Attraction[] = [];

  for (const attraction of attractions) {
    const summary = buildRouteSummary([...selected, attraction]);
    if (
      selected.length < 2 ||
      summary.totalDurationMinutes <= preferences.maxDuration
    ) {
      selected.push(attraction);
    }

    if (selected.length >= 5) break;
  }

  return selected;
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

function buildRouteDescription(
  preferences: UserPreferences,
  summary: RouteSummary
) {
  const hours = Math.floor(summary.totalDurationMinutes / 60);
  const minutes = summary.totalDurationMinutes % 60;
  return `Маршрут рассчитан под темп "${preferences.pace}" и займёт примерно ${hours} ч ${minutes} мин.`;
}
