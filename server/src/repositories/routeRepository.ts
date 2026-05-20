import type { PoolClient } from "pg";
import { pool, query } from "../db.js";
import type {
  AdminRouteWithOwner,
  Attraction,
  RouteSummary,
  RouteWithPoints
} from "../types.js";
import { toAttraction } from "./attractionRepository.js";

interface RouteRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  total_distance_km: string;
  total_duration_minutes: number;
  route_date: Date | null;
  is_public: boolean;
  created_at: Date;
}

interface AdminRouteRow extends RouteRow {
  owner_id: string;
  owner_name: string;
  owner_email: string;
}

interface RoutePointRow {
  point_id: string;
  position: number;
  note: string | null;
  planned_start_time: string | null;
  id: string;
  name: string;
  city: string;
  address: string | null;
  category: string;
  description: string;
  latitude: string;
  longitude: string;
  duration_minutes: number;
  budget_level: "free" | "low" | "mid" | "high";
  rating: string;
  image_url: string | null;
  tags: string[];
}

export async function createRoute(input: {
  userId: string;
  name: string;
  description?: string;
  routeDate?: string;
  isPublic?: boolean;
  points: Attraction[];
  summary: RouteSummary;
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const routeResult = await client.query<RouteRow>(
      `INSERT INTO routes (
         user_id, name, description, route_date, is_public,
         total_distance_km, total_duration_minutes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.userId,
        input.name,
        input.description ?? null,
        input.routeDate ?? null,
        input.isPublic ?? false,
        input.summary.totalDistanceKm,
        input.summary.totalDurationMinutes
      ]
    );

    const route = routeResult.rows[0];

    for (const [index, attraction] of input.points.entries()) {
      await client.query(
        `INSERT INTO route_points (route_id, attraction_id, position)
         VALUES ($1, $2, $3)`,
        [route.id, attraction.id, index + 1]
      );
    }

    await client.query("COMMIT");
    return getRouteById(route.id, input.userId, client);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listRoutesByUser(userId: string) {
  const routes = await query<RouteRow>(
    `SELECT *
     FROM routes
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  const result: RouteWithPoints[] = [];
  for (const route of routes.rows) {
    const routeWithPoints = await getRouteById(route.id, userId);
    if (routeWithPoints) result.push(routeWithPoints);
  }

  return result;
}

export async function listRoutesForAdmin(userId?: string) {
  const params: string[] = [];
  const where: string[] = ["u.is_active = TRUE"];

  if (userId) {
    params.push(userId);
    where.push(`r.user_id = $${params.length}`);
  }

  const routes = await query<AdminRouteRow>(
    `SELECT
       r.*,
       u.id AS owner_id,
       u.name AS owner_name,
       u.email AS owner_email
     FROM routes r
     JOIN users u ON u.id = r.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY r.created_at DESC`,
    params
  );

  const result: AdminRouteWithOwner[] = [];
  for (const route of routes.rows) {
    const routeWithPoints = await getRouteByIdForAdmin(route.id, route);
    if (routeWithPoints) result.push(routeWithPoints);
  }

  return result;
}

export async function getRouteById(
  routeId: string,
  userId: string,
  client?: PoolClient
) {
  const executor = client ?? pool;
  const routeResult = await executor.query<RouteRow>(
    `SELECT *
     FROM routes
     WHERE id = $1 AND user_id = $2`,
    [routeId, userId]
  );

  if (!routeResult.rows[0]) return null;

  const pointResult = await executor.query<RoutePointRow>(
    `SELECT
       rp.id AS point_id,
       rp.position,
       rp.note,
       rp.planned_start_time,
       a.*
     FROM route_points rp
     JOIN attractions a ON a.id = rp.attraction_id
     WHERE rp.route_id = $1
     ORDER BY rp.position ASC`,
    [routeId]
  );

  return toRoute(routeResult.rows[0], pointResult.rows);
}

export async function getRouteByIdForAdmin(
  routeId: string,
  routeRow?: AdminRouteRow
) {
  const route =
    routeRow ??
    (
      await query<AdminRouteRow>(
        `SELECT
           r.*,
           u.id AS owner_id,
           u.name AS owner_name,
           u.email AS owner_email
         FROM routes r
         JOIN users u ON u.id = r.user_id
         WHERE r.id = $1 AND u.is_active = TRUE`,
        [routeId]
      )
    ).rows[0];

  if (!route) return null;

  const pointResult = await query<RoutePointRow>(
    `SELECT
       rp.id AS point_id,
       rp.position,
       rp.note,
       rp.planned_start_time,
       a.*
     FROM route_points rp
     JOIN attractions a ON a.id = rp.attraction_id
     WHERE rp.route_id = $1
     ORDER BY rp.position ASC`,
    [routeId]
  );

  return {
    ...toRoute(route, pointResult.rows),
    owner: {
      id: route.owner_id,
      name: route.owner_name,
      email: route.owner_email
    }
  } satisfies AdminRouteWithOwner;
}

export async function deleteRoute(routeId: string, userId: string) {
  const result = await query<RouteRow>(
    "DELETE FROM routes WHERE id = $1 AND user_id = $2 RETURNING *",
    [routeId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function deleteRouteForAdmin(routeId: string) {
  const result = await query<RouteRow>(
    "DELETE FROM routes WHERE id = $1 RETURNING *",
    [routeId]
  );

  return (result.rowCount ?? 0) > 0;
}

function toRoute(row: RouteRow, points: RoutePointRow[]): RouteWithPoints {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    totalDistanceKm: Number(row.total_distance_km),
    totalDurationMinutes: row.total_duration_minutes,
    routeDate: row.route_date?.toISOString().slice(0, 10) ?? null,
    isPublic: row.is_public,
    createdAt: row.created_at.toISOString(),
    points: points.map((point) => ({
      id: point.point_id,
      position: point.position,
      note: point.note,
      plannedStartTime: point.planned_start_time,
      attraction: toAttraction(point)
    }))
  };
}
