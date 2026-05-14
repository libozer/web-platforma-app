import type {
  Attraction,
  AuthResponse,
  RecommendationPayload,
  RoutePreview,
  RouteWithPoints,
  TravelMode,
  User
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000/api";
const TOKEN_KEY = "tourmind_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: input
  });
}

export async function login(input: { email: string; password: string }) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: input
  });
}

export async function getProfile() {
  return request<{ user: User }>("/profile");
}

export async function updateProfile(input: Partial<User>) {
  return request<{ user: User }>("/profile", {
    method: "PATCH",
    body: input
  });
}

export async function getAttractions(params: {
  search?: string;
  category?: string;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);

  return request<{ attractions: Attraction[] }>(
    `/attractions${query.toString() ? `?${query}` : ""}`
  );
}

export async function getRecommendations() {
  return request<RecommendationPayload>("/recommendations");
}

export async function previewRoute(input: {
  attractionIds: string[];
  optimize: boolean;
  travelMode: TravelMode;
}) {
  return request<RoutePreview>("/routes/preview", {
    method: "POST",
    body: input
  });
}

export async function saveRoute(input: {
  name: string;
  description?: string;
  routeDate?: string;
  attractionIds: string[];
  optimize: boolean;
  travelMode: TravelMode;
}) {
  return request<{ route: RouteWithPoints }>("/routes", {
    method: "POST",
    body: input
  });
}

export async function getRoutes() {
  return request<{ routes: RouteWithPoints[] }>("/routes");
}

export async function removeRoute(id: string) {
  await request<void>(`/routes/${id}`, {
    method: "DELETE"
  });
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? "Ошибка запроса к серверу");
  }

  return payload as T;
}
