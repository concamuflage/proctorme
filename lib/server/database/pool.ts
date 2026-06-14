import { Pool } from "pg";
import { postgresPoolConfig } from "@/lib/server/serverEnv";

const pool = new Pool(postgresPoolConfig());

export default pool;
