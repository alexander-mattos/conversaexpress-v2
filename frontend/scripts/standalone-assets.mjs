// O build standalone não leva public/ nem .next/static: copia os dois para que
// `node .next/standalone/server.js` sirva a aplicação completa (PM2 ou container).
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.log("standalone-assets: .next/standalone não existe, nada a copiar.");
  process.exit(0);
}

for (const [from, to] of [
  [join(root, "public"), join(standalone, "public")],
  [join(root, ".next", "static"), join(standalone, ".next", "static")]
]) {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}
console.log("standalone-assets: public/ e .next/static copiados.");
