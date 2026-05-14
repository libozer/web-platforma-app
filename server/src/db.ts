import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export interface DbResult<T> {
  rows: T[];
  rowCount: number | null;
}

export async function query<T extends object>(
  text: string,
  params: unknown[] = []
): Promise<DbResult<T>> {
  return pool.query(text, params) as Promise<DbResult<T>>;
}
