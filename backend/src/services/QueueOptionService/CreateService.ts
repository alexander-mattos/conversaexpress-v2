import QueueOption from "../../models/QueueOption";

interface QueueOptionData {
  queueId: string | number;
  title: string;
  option: string;
  message?: string | null;
  parentId?: string | number | null;
}

const CreateService = async (queueOptionData: QueueOptionData): Promise<QueueOption> => {
  const queueOption = await QueueOption.create({ ...queueOptionData });
  return queueOption;
};

export default CreateService;
