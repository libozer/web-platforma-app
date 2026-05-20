import { query } from "../db.js";

export async function trackActivity(input: {
  userId: string;
  activityType:
    | "route_view"
    | "attraction_view"
    | "search"
    | "route_created"
    | "admin_route_deleted";
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await query(
    `INSERT INTO user_activity (user_id, activity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4)`,
    [
      input.userId,
      input.activityType,
      input.entityId ?? null,
      input.metadata ?? {}
    ]
  );
}
