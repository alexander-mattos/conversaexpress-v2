import { QueryInterface, DataTypes } from "sequelize";

// ID interno do WhatsApp (xxxx@lid) do contato, quando ele chega assim.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "lid", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addIndex("Contacts", ["companyId", "lid"], { name: "contacts_company_lid" });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Contacts", "contacts_company_lid");
    await queryInterface.removeColumn("Contacts", "lid");
  }
};
