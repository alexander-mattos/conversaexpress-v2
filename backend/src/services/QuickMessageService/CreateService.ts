import * as Yup from "yup";
import AppError from "../../errors/AppError";
import QuickMessage from "../../models/QuickMessage";

interface Data {
  shortcode: string;
  message: string;
  companyId: number | string;
  userId: number | string;
}

const CreateService = async (data: Data): Promise<QuickMessage> => {
  const { shortcode, message } = data;

  const ticketnoteSchema = Yup.object().shape({
    shortcode: Yup.string()
      .min(3, "ERR_QUICKMESSAGE_INVALID_NAME")
      .required("ERR_QUICKMESSAGE_REQUIRED"),
    message: Yup.string()
      .min(3, "ERR_QUICKMESSAGE_INVALID_NAME")
      .required("ERR_QUICKMESSAGE_REQUIRED")
  });

  try {
    await ticketnoteSchema.validate({ shortcode, message });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Só os campos do formulário: mediaPath/mediaName vêm do upload (antes o
  // corpo podia apontar para o arquivo de outra empresa e depois apagá-lo).
  const record = await QuickMessage.create({
    shortcode: data.shortcode,
    message: data.message,
    companyId: data.companyId,
    userId: data.userId
  });

  return record;
};

export default CreateService;
