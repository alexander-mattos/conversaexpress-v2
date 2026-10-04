import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Antes: "return a, b;" disparava as duas operações sem esperar a remoção.
    await queryInterface.removeConstraint("Tickets", "contactid_companyid_unique");
    await queryInterface.addConstraint("Tickets", {
      fields: ["contactId", "companyId", "whatsappId"],
      type: "unique",
      name: "contactid_companyid_unique"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeConstraint(
      "Tickets",
      "contactid_companyid_unique"
    );
  }
};
