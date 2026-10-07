import Invoices from "../../models/Invoices";
import Company from "../../models/Company";

// companyId undefined = todas as empresas (só o super chega aqui assim).
const FindAllInvoiceService = async (companyId?: number): Promise<Invoices[]> => {
  const invoice = await Invoices.findAll({
    where: companyId === undefined ? {} : { companyId },
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["id", "ASC"]]
  });
  return invoice;
};

export default FindAllInvoiceService;
