import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "../utils/crypto.js";

export interface UserModel {
  id?: string;
  name?: string;
  email: string;
  password?: string;
  passwordHash?: string;
  role?: string;
  isActive?: boolean;
  vipStatus?: boolean;
  subscriptionStatus?: string;
  settings?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

export interface RouteModel {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  totalDistanceKm?: number;
  attractionIds?: string[];
  categories?: string[];
  rating?: number;
  visitCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttractionModel {
  id?: string;
  routeIds?: string[];
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  category?: string;
  rating?: number;
  durationMinutes?: number;
}

export interface NotificationModel {
  id?: string;
  userId: string;
  title: string;
  message: string;
  read?: boolean;
  createdAt?: string;
}

export interface SessionModel {
  token: string;
  userId: string;
  createdAt: string;
  active: boolean;
}

export class DatabaseConnector {
  private connected = false;
  private transactionActive = false;

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
    this.transactionActive = false;
  }

  async beginTransaction() {
    this.ensureConnected();
    this.transactionActive = true;
  }

  async commitTransaction() {
    this.ensureConnected();
    this.transactionActive = false;
  }

  async rollbackTransaction() {
    this.ensureConnected();
    this.transactionActive = false;
  }

  private ensureConnected() {
    if (!this.connected) {
      throw new Error("Database connection is not active");
    }
  }
}

export class UserRepository {
  private users = new Map<string, UserModel>();

  async addUser(user: UserModel) {
    const existing = await this.getUserByEmail(user.email);
    if (existing) throw new Error("User with this email already exists");

    const saved: UserModel = {
      ...user,
      id: user.id ?? makeId("user"),
      role: user.role ?? "traveler",
      isActive: user.isActive ?? true
    };

    this.users.set(saved.id as string, saved);
    return saved;
  }

  async getUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async updateUser(user: UserModel) {
    if (!user.id || !this.users.has(user.id)) {
      throw new Error("User not found");
    }

    const updated = { ...this.users.get(user.id), ...user };
    this.users.set(user.id, updated);
    return updated;
  }

  async deleteUser(id: string) {
    return this.users.delete(id);
  }

  async getUserByEmail(email: string) {
    return (
      Array.from(this.users.values()).find((user) => user.email === email) ?? null
    );
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }
}

export class RouteRepository {
  private routes = new Map<string, RouteModel>();

  async addRoute(route: RouteModel) {
    const saved: RouteModel = {
      ...route,
      id: route.id ?? makeId("route"),
      createdAt: route.createdAt ?? new Date().toISOString()
    };

    this.routes.set(saved.id as string, saved);
    return saved;
  }

  async getRoutesByUser(userId: string) {
    return Array.from(this.routes.values()).filter(
      (route) => route.userId === userId
    );
  }

  async updateRoute(route: RouteModel) {
    if (!route.id || !this.routes.has(route.id)) {
      throw new Error("Route not found");
    }

    const updated = {
      ...this.routes.get(route.id),
      ...route,
      updatedAt: new Date().toISOString()
    };
    this.routes.set(route.id, updated);
    return updated;
  }

  async deleteRoute(id: string) {
    return this.routes.delete(id);
  }

  async getRouteById(id: string) {
    return this.routes.get(id) ?? null;
  }

  async getAllRoutes() {
    return Array.from(this.routes.values());
  }
}

export class AttractionRepository {
  private attractions = new Map<string, AttractionModel>();

  async addAttraction(attraction: AttractionModel) {
    const saved = { ...attraction, id: attraction.id ?? makeId("attraction") };
    this.attractions.set(saved.id as string, saved);
    return saved;
  }

  async getAttractionsByRoute(routeId: string) {
    return Array.from(this.attractions.values()).filter((attraction) =>
      attraction.routeIds?.includes(routeId)
    );
  }

  async updateAttraction(attraction: AttractionModel) {
    if (!attraction.id || !this.attractions.has(attraction.id)) {
      throw new Error("Attraction not found");
    }

    const updated = { ...this.attractions.get(attraction.id), ...attraction };
    this.attractions.set(attraction.id, updated);
    return updated;
  }

  async deleteAttraction(id: string) {
    return this.attractions.delete(id);
  }

  async getAttractionById(id: string) {
    return this.attractions.get(id) ?? null;
  }

  async getAllAttractions() {
    return Array.from(this.attractions.values());
  }
}

export class AnalyticsRepository {
  private routeVisits: Array<{ userId: string; routeId: string; date: string }> =
    [];

  async recordRouteVisit(userId: string, routeId: string) {
    this.routeVisits.push({ userId, routeId, date: new Date().toISOString() });
  }

  async getPopularRoutes(limit: number) {
    const counts = new Map<string, number>();
    for (const visit of this.routeVisits) {
      counts.set(visit.routeId, (counts.get(visit.routeId) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([routeId, visits]) => ({ routeId, visits }));
  }

  async getUserStatistics(userId: string) {
    const visits = this.routeVisits.filter((visit) => visit.userId === userId);
    return {
      visitedRoutes: visits.map((visit) => visit.routeId),
      visitsCount: visits.length
    };
  }
}

export class NotificationRepository {
  private notifications = new Map<string, NotificationModel>();

  async addNotification(notification: NotificationModel) {
    const saved = {
      ...notification,
      id: notification.id ?? makeId("notification"),
      read: notification.read ?? false,
      createdAt: notification.createdAt ?? new Date().toISOString()
    };
    this.notifications.set(saved.id as string, saved);
    return saved;
  }

  async getNotificationsByUser(userId: string) {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId
    );
  }

  async markAsRead(notificationId: string) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    const updated = { ...notification, read: true };
    this.notifications.set(notificationId, updated);
    return updated;
  }

  async deleteNotification(notificationId: string) {
    return this.notifications.delete(notificationId);
  }
}

export class SessionManager {
  private sessions = new Map<string, SessionModel>();

  createSession(userId: string) {
    const token = makeId("token");
    this.sessions.set(token, {
      token,
      userId,
      active: true,
      createdAt: new Date().toISOString()
    });
    return token;
  }

  getSession(token: string) {
    const session = this.sessions.get(token);
    return session?.active ? session : null;
  }

  invalidateSession(token: string) {
    const session = this.sessions.get(token);
    if (!session) return false;

    this.sessions.set(token, { ...session, active: false });
    return true;
  }

  invalidateSessionsByUser(userId: string) {
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.set(token, { ...session, active: false });
      }
    }
  }
}

export class AuthService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly sessions = new SessionManager()
  ) {}

  async register(email: string, password: string) {
    const passwordHash = await hashPassword(password);
    const user = await this.users.addUser({
      email,
      name: email.split("@")[0],
      passwordHash
    });
    const token = this.sessions.createSession(user.id as string);
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await this.users.getUserByEmail(email);
    if (!user?.passwordHash) throw new Error("Invalid credentials");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new Error("Invalid credentials");

    const token = this.sessions.createSession(user.id as string);
    return { user, token };
  }

  async logout(userId: string) {
    this.sessions.invalidateSessionsByUser(userId);
  }

  validateToken(token: string) {
    return this.sessions.getSession(token) !== null;
  }
}

export class UserService {
  constructor(private readonly users = new UserRepository()) {}

  async getProfile(userId: string) {
    return this.users.getUserById(userId);
  }

  async updateProfile(userId: string, data: UserModel) {
    return this.users.updateUser({ ...data, id: userId });
  }

  async deleteAccount(userId: string) {
    return this.users.deleteUser(userId);
  }

  async updatePreferences(userId: string, preferences: object) {
    const user = await this.users.getUserById(userId);
    if (!user) throw new Error("User not found");
    return this.users.updateUser({ ...user, preferences: { ...preferences } });
  }
}

export class AccessControl {
  private roles = new Map<string, string>();

  checkAccess(userId: string, resource: string) {
    const role = this.roles.get(userId) ?? "user";
    return role === "admin" || !resource.startsWith("admin");
  }

  assignRole(userId: string, role: string) {
    this.roles.set(userId, role);
  }

  getUserRole(userId: string) {
    return this.roles.get(userId) ?? "user";
  }
}

export class RouteService {
  constructor(private readonly routes = new RouteRepository()) {}

  async createRoute(userId: string, routeData: RouteModel) {
    return this.routes.addRoute({ ...routeData, userId });
  }

  async getUserRoutes(userId: string) {
    return this.routes.getRoutesByUser(userId);
  }

  async getRouteDetails(routeId: string) {
    return this.routes.getRouteById(routeId);
  }

  async updateRoute(routeId: string, routeData: RouteModel) {
    return this.routes.updateRoute({ ...routeData, id: routeId });
  }

  async deleteRoute(routeId: string) {
    return this.routes.deleteRoute(routeId);
  }
}

export class AttractionService {
  constructor(private readonly attractions = new AttractionRepository()) {}

  async addAttraction(routeId: string, attractionData: AttractionModel) {
    return this.attractions.addAttraction({
      ...attractionData,
      routeIds: [...(attractionData.routeIds ?? []), routeId]
    });
  }

  async getAttractions(routeId: string) {
    return this.attractions.getAttractionsByRoute(routeId);
  }

  async updateAttraction(attractionId: string, attractionData: AttractionModel) {
    return this.attractions.updateAttraction({
      ...attractionData,
      id: attractionId
    });
  }

  async deleteAttraction(attractionId: string) {
    return this.attractions.deleteAttraction(attractionId);
  }
}

export class RouteBuilder {
  private pointsByRoute = new Map<string, string[]>();

  addPoint(routeId: string, attractionId: string) {
    const points = this.pointsByRoute.get(routeId) ?? [];
    this.pointsByRoute.set(routeId, [...points, attractionId]);
  }

  removePoint(routeId: string, attractionId: string) {
    const points = this.pointsByRoute.get(routeId) ?? [];
    this.pointsByRoute.set(
      routeId,
      points.filter((point) => point !== attractionId)
    );
  }

  reorderPoints(routeId: string, points: string[]) {
    this.pointsByRoute.set(routeId, [...points]);
  }

  calculateDuration(routeId: string) {
    const points = this.pointsByRoute.get(routeId) ?? [];
    return points.length * 60;
  }
}

export class RecomendationService {
  constructor(
    private readonly routeRepository = new RouteRepository(),
    private readonly preferenceAnalyzer = new PreferenceAnalyzer(),
    private readonly scoringEngine = new ScoringEngine()
  ) {}

  async generateRecommendations(userId: string) {
    const routes = await this.routeRepository.getAllRoutes();
    const profile = await this.preferenceAnalyzer.getPreferenceProfile(userId);
    return this.scoringEngine.rankRoutes(routes, String(profile.userId));
  }

  async getRecommendedRoutes(userId: string) {
    return this.generateRecommendations(userId);
  }

  async updateRecommendations(userId: string) {
    return this.generateRecommendations(userId);
  }
}

export class RecommendationService extends RecomendationService {}

export class PreferenceAnalyzer {
  private profiles = new Map<string, Record<string, unknown>>();

  async analyzeUserPreferences(userId: string) {
    return this.profiles.get(userId) ?? { userId, interests: [] };
  }

  async updatePreferences(userId: string, data: object) {
    this.profiles.set(userId, { userId, ...data });
    return this.profiles.get(userId);
  }

  async getPreferenceProfile(userId: string) {
    return this.analyzeUserPreferences(userId);
  }
}

export class ScoringEngine {
  async calculateScore(routeId: string, userId: string) {
    return routeId.length + userId.length;
  }

  async rankRoutes(routes: RouteModel[], userId: string) {
    const ranked = await Promise.all(
      routes.map(async (route) => ({
        ...route,
        score: await this.calculateScore(route.id ?? route.name, userId)
      }))
    );
    return ranked.sort((a, b) => b.score - a.score);
  }

  applyFilters(routes: RouteModel[], filters: Record<string, unknown>) {
    return routes.filter((route) => {
      if (typeof filters.maxDuration === "number") {
        return (route.durationMinutes ?? 0) <= filters.maxDuration;
      }
      return true;
    });
  }
}

export class ExternalAPIService {
  async sendRequest(url: string, params: object = {}) {
    const requestUrl = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      requestUrl.searchParams.set(key, String(value));
    }

    const response = await fetch(requestUrl);
    return this.handleResponse(response);
  }

  async handleResponse(response: Response) {
    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`);
    }
    return response.json() as Promise<unknown>;
  }

  handleError(error: object) {
    return { ok: false, error };
  }
}

export class PlacesAPIService extends ExternalAPIService {
  async searchPlaces(query: string) {
    return [{ id: makeId("place"), query }];
  }

  async getPlaceDetails(placeId: string) {
    return { id: placeId, name: "Tourist place" };
  }

  async getNearbyPlaces(location: object) {
    return [{ id: makeId("nearby"), location }];
  }
}

export class AdminService {
  constructor(private readonly users = new UserRepository()) {}

  async getAllUsers() {
    return this.users.getAllUsers();
  }

  async blockUser(userId: string) {
    const user = await this.users.getUserById(userId);
    if (!user) return null;
    return this.users.updateUser({ ...user, isActive: false });
  }

  async unblockUser(userId: string) {
    const user = await this.users.getUserById(userId);
    if (!user) return null;
    return this.users.updateUser({ ...user, isActive: true });
  }

  async deleteUser(userId: string) {
    return this.users.deleteUser(userId);
  }
}

export class AccessManagementService {
  private accessControl = new AccessControl();

  assignAdminRole(userId: string) {
    this.accessControl.assignRole(userId, "admin");
  }

  revokeAdminRole(userId: string) {
    this.accessControl.assignRole(userId, "user");
  }

  checkAdminAccess(userId: string) {
    return this.accessControl.getUserRole(userId) === "admin";
  }
}

export class MainPageComponent {
  private currentView = "planner";

  render() {
    return this.currentView;
  }

  handleNavigation(view = "planner") {
    this.currentView = view;
  }
}

export class AuthComponent {
  constructor(private readonly authService = new AuthService()) {}

  async handleLogin(data: { email: string; password: string }) {
    return this.authService.login(data.email, data.password);
  }

  async handleRegister(data: { email: string; password: string }) {
    return this.authService.register(data.email, data.password);
  }

  validateInput(data: object) {
    return Object.values(data).every((value) => String(value).trim().length > 0);
  }
}

export class ProfileComponent {
  constructor(
    private readonly userService = new UserService(),
    private readonly routeService = new RouteService()
  ) {}

  async loadProfile(userId: string) {
    return this.userService.getProfile(userId);
  }

  async updateProfile(data: UserModel) {
    if (!data.id) throw new Error("User id is required");
    return this.userService.updateProfile(data.id, data);
  }

  async displayUserRoutes(userId: string) {
    return this.routeService.getUserRoutes(userId);
  }
}

export class RouteComponent {
  constructor(private readonly routeService = new RouteService()) {}

  async displayRoutes(userId: string) {
    return this.routeService.getUserRoutes(userId);
  }

  async openRoute(routeId: string) {
    return this.routeService.getRouteDetails(routeId);
  }

  async createRoute(data: RouteModel) {
    return this.routeService.createRoute(data.userId, data);
  }
}

export class MapComponent {
  private markers: object[] = [];
  private route: unknown[] = [];

  renderMap() {
    return { markers: this.markers, route: this.route };
  }

  drawRoute(points: unknown[]) {
    this.route = [...points];
    return this.route;
  }

  addMarker(point: object) {
    this.markers.push(point);
    return point;
  }
}

export class RecomendationComponent {
  constructor(private readonly service = new RecomendationService()) {}

  async loadRecommendations(userId: string) {
    return this.service.getRecommendedRoutes(userId);
  }

  async displayRecommendations(userId: string) {
    return this.loadRecommendations(userId);
  }
}

export class RecommendationComponent extends RecomendationComponent {}

function makeId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}
