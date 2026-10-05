import uploadConfig from "../../config/upload";

const create = jest.fn();
jest.mock("../../models/QuickMessage", () => ({ __esModule: true, default: { create } }));

/* eslint-disable @typescript-eslint/no-var-requires */
const CreateService = require("../../services/QuickMessageService/CreateService").default;

const fileNameFor = (typeArch: string | undefined, originalname: string): Promise<string> =>
  new Promise(resolve => {
    // multer.diskStorage guarda as funções em getFilename.
    (uploadConfig.storage as any).getFilename({ body: { typeArch } }, { originalname }, (_: unknown, name: string) =>
      resolve(name)
    );
  });

describe("mídia de resposta rápida", () => {
  it("cada envio ganha nome único (não sobrescreve o de outra empresa)", async () => {
    const name = await fileNameFor("quickMessage", "catalogo.pdf");
    expect(name).toMatch(/^\d+_catalogo\.pdf$/);
  });

  it("listas de arquivos mantêm o nome (pasta própria por lista)", async () => {
    expect(await fileNameFor("fileList", "contrato.pdf")).toBe("contrato.pdf");
  });

  it("criar ignora mediaPath/mediaName do corpo", async () => {
    create.mockResolvedValue({ id: 1 });
    await CreateService({
      shortcode: "ola",
      message: "Olá, tudo bem?",
      companyId: 7,
      userId: 2,
      mediaPath: "../outra-empresa.pdf",
      mediaName: "x"
    });
    expect(create).toHaveBeenCalledWith({ shortcode: "ola", message: "Olá, tudo bem?", companyId: 7, userId: 2 });
  });
});
