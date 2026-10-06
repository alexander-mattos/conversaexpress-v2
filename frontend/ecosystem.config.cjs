// PM2: roda o build standalone (`npm run build` já copia os estáticos).
// A porta vem do .env.production gerado pelo instalador; o nome do processo,
// de PM2_APP_NAME (ex.: PM2_APP_NAME=empresa-frontend pm2 start ecosystem.config.cjs).
/* eslint-disable @typescript-eslint/no-require-imports -- o PM2 lê este arquivo como CommonJS */
const fs = require("fs");
const path = require("path");

const env = {};
try {
  for (const line of fs.readFileSync(path.join(__dirname, ".env.production"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2];
  }
} catch {
  // Sem .env.production: usa os padrões abaixo.
}

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "conversaexpress-frontend",
      cwd: __dirname,
      script: ".next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        PORT: env.PORT || "3000",
        HOSTNAME: "127.0.0.1"
      }
    }
  ]
};
