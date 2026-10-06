import path from "path";
import type { SdkOptions } from "sdk-node-apis-efi";

// Credenciais da Efí (Pix). O certificado .p12 fica em backend/certs/<nome>.p12.
const options: SdkOptions = {
  sandbox: process.env.GERENCIANET_SANDBOX === "true",
  client_id: process.env.GERENCIANET_CLIENT_ID as string,
  client_secret: process.env.GERENCIANET_CLIENT_SECRET as string,
  certificate: path.join(__dirname, `../../certs/${process.env.GERENCIANET_PIX_CERT}.p12`)
};

export default options;
