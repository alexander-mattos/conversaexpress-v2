import { QueryInterface, DataTypes } from "sequelize";

// Cobrança da plataforma pelo Asaas: CPF/CNPJ e cliente da empresa,
// e a cobrança correspondente a cada fatura.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Companies", "document", { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn("Companies", "asaasCustomerId", { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn("Invoices", "providerPaymentId", { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn("Invoices", "invoiceUrl", { type: DataTypes.STRING, allowNull: true });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Invoices", "invoiceUrl");
    await queryInterface.removeColumn("Invoices", "providerPaymentId");
    await queryInterface.removeColumn("Companies", "asaasCustomerId");
    await queryInterface.removeColumn("Companies", "document");
  }
};
