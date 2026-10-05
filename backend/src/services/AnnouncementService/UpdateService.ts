import AppError from "../../errors/AppError";
import Announcement from "../../models/Announcement";

interface Data {
  id: number | string;
  priority?: number;
  title?: string;
  text?: string;
  status?: boolean;
}

const UpdateService = async (data: Data): Promise<Announcement> => {
  const { id } = data;

  const record = await Announcement.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_ANNOUNCEMENT_FOUND", 404);
  }

  const { id: _id, ...fields } = data;
  await record.update(fields);

  return record;
};

export default UpdateService;
