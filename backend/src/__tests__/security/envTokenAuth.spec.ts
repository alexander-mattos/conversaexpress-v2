import { Request, Response } from "express";
import envTokenAuth from "../../middleware/envTokenAuth";

const run = (query: Record<string, unknown>, body: Record<string, unknown> = {}) => {
  const next = jest.fn();
  const req = { query, body } as unknown as Request;
  envTokenAuth(req, {} as Response, next);
  return next;
};

describe("envTokenAuth", () => {
  const original = process.env.ENV_TOKEN;
  afterEach(() => {
    process.env.ENV_TOKEN = original;
  });

  it("bloqueia quando ENV_TOKEN não está configurado (antes liberava)", () => {
    delete process.env.ENV_TOKEN;
    expect(() => run({})).toThrow();
    expect(() => run({ token: undefined })).toThrow();
  });

  it("bloqueia token errado", () => {
    process.env.ENV_TOKEN = "segredo";
    expect(() => run({ token: "errado" })).toThrow();
    expect(() => run({}, { token: ["segredo"] })).toThrow();
  });

  it("libera token correto na query ou no corpo", () => {
    process.env.ENV_TOKEN = "segredo";
    expect(run({ token: "segredo" })).toHaveBeenCalled();
    expect(run({}, { token: "segredo" })).toHaveBeenCalled();
  });
});
