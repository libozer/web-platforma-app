import { query } from "../db.js";
import type { Attraction, BudgetLevel } from "../types.js";

interface AttractionRow {
  id: string;
  name: string;
  city: string;
  address: string | null;
  category: string;
  description: string;
  latitude: string;
  longitude: string;
  duration_minutes: number;
  budget_level: BudgetLevel;
  rating: string;
  image_url: string | null;
  tags: string[];
}

export interface AttractionFilters {
  search?: string;
  category?: string;
  budgetLevel?: BudgetLevel;
}

export async function findAttractions(filters: AttractionFilters = {}) {
  const params: unknown[] = [];
  const where: string[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(
      `(name ILIKE $${params.length} OR description ILIKE $${params.length} OR array_to_string(tags, ' ') ILIKE $${params.length})`
    );
  }

  if (filters.category) {
    params.push(filters.category);
    where.push(`category = $${params.length}`);
  }

  if (filters.budgetLevel) {
    params.push(filters.budgetLevel);
    where.push(`budget_level = $${params.length}`);
  }

  const result = await query<AttractionRow>(
    `SELECT *
     FROM attractions
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY rating DESC, name ASC`,
    params
  );

  return result.rows.map(toAttraction);
}

export async function findAttractionById(id: string) {
  const result = await query<AttractionRow>(
    "SELECT * FROM attractions WHERE id = $1",
    [id]
  );
  return result.rows[0] ? toAttraction(result.rows[0]) : null;
}

export async function findAttractionsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const result = await query<AttractionRow>(
    "SELECT * FROM attractions WHERE id = ANY($1::uuid[])",
    [ids]
  );

  const byId = new Map(result.rows.map((row) => [row.id, toAttraction(row)]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as Attraction[];
}

export function toAttraction(row: AttractionRow): Attraction {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address,
    category: row.category,
    description: row.description,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    durationMinutes: row.duration_minutes,
    budgetLevel: row.budget_level,
    rating: Number(row.rating),
    imageUrl: row.image_url,
    tags: row.tags ?? []
  };
}
