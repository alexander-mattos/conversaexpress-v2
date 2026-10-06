// Espera o Postgres aceitar conexões (até ~60s).
// Com --is-empty, sai com 0 se ainda não há empresas (banco recém-criado).
const { Client } = require("pg");

const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const connect = async () => {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const client = new Client(config);
    try {
      await client.connect();
      return client;
    } catch (err) {
      await client.end().catch(() => undefined);
      console.log(`[db-wait] aguardando o banco (${attempt}/30): ${err.message}`);
      await sleep(2000);
    }
  }
  throw new Error("banco indisponível");
};

(async () => {
  const client = await connect();
  try {
    if (process.argv.includes("--is-empty")) {
      const { rows } = await client.query('SELECT count(*)::int AS total FROM "Companies"');
      process.exit(rows[0].total === 0 ? 0 : 1);
    }
  } finally {
    await client.end();
  }
})().catch(err => {
  console.error(`[db-wait] ${err.message}`);
  process.exit(2);
});
