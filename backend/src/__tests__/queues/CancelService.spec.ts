const getJob = jest.fn();
const remove = jest.fn();
jest.mock("../../queues", () => ({ campaignQueue: { getJob } }));
jest.mock("../../models/Campaign", () => ({
  __esModule: true,
  default: { findOne: jest.fn().mockResolvedValue({ id: 5, status: "EM_ANDAMENTO", update: jest.fn() }) }
}));
jest.mock("../../models/CampaignShipping", () => ({
  __esModule: true,
  default: { findAll: jest.fn().mockResolvedValue([{ jobId: "10" }, { jobId: "11" }]) }
}));

import { CancelService } from "../../services/CampaignService/CancelService";

describe("CancelService", () => {
  it("remove os jobs existentes e ignora os que já não existem", async () => {
    getJob.mockImplementation(async (id: string) => (id === "10" ? { remove } : null));
    await expect(CancelService(5, 1)).resolves.toMatchObject({ id: 5 });
    expect(getJob).toHaveBeenCalledWith("10");
    expect(getJob).toHaveBeenCalledWith("11");
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
