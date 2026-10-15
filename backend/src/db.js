import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000, // falha rápido se o banco estiver fora
});

// Sem isso, derrubar o banco com conexões ociosas derruba o Node junto.
pool.on('error', (err) => console.error('Erro no pool do Postgres:', err.message));