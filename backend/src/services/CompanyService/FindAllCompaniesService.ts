import Company from "../../models/Company";
import Plan from "../../models/Plan";
import Setting from "../../models/Setting";

const FindAllCompanyService = async (): Promise<Company[]> => {
  const companies = await Company.findAll({
    order: [["name", "ASC"]],
    include: [
      { model: Plan, as: "plan", attributes: ["id", "name", "value"] },
      // Só a configuração que a tela de Empresas usa: antes iam todas, com os
      // tokens das integrações de cada empresa.
      { model: Setting, as: "settings", attributes: ["id", "key", "value"], where: { key: "campaignsEnabled" }, required: false }
    ]
  });
  return companies;
};

export default FindAllCompanyService;
