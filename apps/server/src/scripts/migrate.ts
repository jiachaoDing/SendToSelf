import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

async function run() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  await migrate(db, {
    migrationsFolder: './drizzle',
  });

  await pool.end();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
