export type BudgetLevel = "free" | "low" | "mid" | "high";
export type TravelPace = "calm" | "balanced" | "active";
export type TravelMode = "walk" | "car";
export type RouteCoordinate = [number, number];

export interface UserPreferences {
  interests: string[];
  budget: BudgetLevel;
  pace: TravelPace;
  maxDuration: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  preferences: UserPreferences;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface Attraction {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  durationMinutes: number;
  budgetLevel: BudgetLevel;
  rating: number;
  imageUrl?: string | null;
  tags: string[];
}

export interface RouteSummary {
  totalDistanceKm: number;
  totalDurationMinutes: number;
}

export interface RoutePreview {
  points: Attraction[];
  summary: RouteSummary;
  geometry: RouteCoordinate[];
  travelMode: TravelMode;
  routingProvider: "openrouteservice" | "direct";
}

export interface RoutePoint {
  id?: string;
  position: number;
  attraction: Attraction;
  note?: string | null;
  plannedStartTime?: string | null;
}

export interface RouteWithPoints {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  routeDate?: string | null;
  isPublic: boolean;
  createdAt: string;
  points: RoutePoint[];
}

export interface AdminUserSummary extends PublicUser {
  routeCount: number;
}

export interface AdminRouteWithOwner extends RouteWithPoints {
  owner: Pick<PublicUser, "id" | "name" | "email">;
}
