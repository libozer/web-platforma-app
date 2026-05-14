import { query } from "../db.js";
import type { PublicUser, UserPreferences } from "../types.js";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  avatar_url: string | null;
  preferences: UserPreferences;
  created_at: Date;
}

export interface UserWithPassword extends PublicUser {
  passwordHash: string;
}

export const defaultPreferences: UserPreferences = {
  interests: ["history", "culture"],
  budget: "mid",
  pace: "balanced",
  maxDuration: 360
};

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  preferences?: Partial<UserPreferences>;
}) {
  const preferences = normalizePreferences(input.preferences);
  const result = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash, preferences)
     VALUES ($1, LOWER($2), $3, $4)
     RETURNING *`,
    [input.name, input.email, input.passwordHash, preferences]
  );

  return toPublicUser(result.rows[0]);
}

export async function findUserById(id: string) {
  const result = await query<UserRow>(
    "SELECT * FROM users WHERE id = $1 AND is_active = TRUE",
    [id]
  );
  return result.rows[0] ? toPublicUser(result.rows[0]) : null;
}

export async function findUserByEmail(email: string) {
  const result = await query<UserRow>(
    "SELECT * FROM users WHERE email = LOWER($1) AND is_active = TRUE",
    [email]
  );
  return result.rows[0] ? toPublicUser(result.rows[0]) : null;
}

export async function findUserWithPasswordByEmail(email: string) {
  const result = await query<UserRow>(
    "SELECT * FROM users WHERE email = LOWER($1) AND is_active = TRUE",
    [email]
  );

  if (!result.rows[0]) return null;

  return {
    ...toPublicUser(result.rows[0]),
    passwordHash: result.rows[0].password_hash
  } satisfies UserWithPassword;
}

export async function updateUserProfile(
  id: string,
  input: {
    name?: string;
    avatarUrl?: string | null;
    preferences?: Partial<UserPreferences>;
  }
) {
  const current = await query<UserRow>(
    "SELECT * FROM users WHERE id = $1 AND is_active = TRUE",
    [id]
  );

  if (!current.rows[0]) return null;

  const preferences = normalizePreferences({
    ...current.rows[0].preferences,
    ...input.preferences
  });

  const result = await query<UserRow>(
    `UPDATE users
     SET name = COALESCE($2, name),
         avatar_url = COALESCE($3, avatar_url),
         preferences = $4,
         updated_at = NOW()
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id, input.name, input.avatarUrl, preferences]
  );

  return result.rows[0] ? toPublicUser(result.rows[0]) : null;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url,
    preferences: normalizePreferences(row.preferences),
    createdAt: row.created_at.toISOString()
  };
}

export function normalizePreferences(
  value: Partial<UserPreferences> | null | undefined
): UserPreferences {
  return {
    interests:
      Array.isArray(value?.interests) && value.interests.length > 0
        ? value.interests
        : defaultPreferences.interests,
    budget: value?.budget ?? defaultPreferences.budget,
    pace: value?.pace ?? defaultPreferences.pace,
    maxDuration: Number(value?.maxDuration ?? defaultPreferences.maxDuration)
  };
}
