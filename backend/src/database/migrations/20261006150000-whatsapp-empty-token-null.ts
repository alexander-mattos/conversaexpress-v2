import { QueryInterface } from "sequelize";

// Conexões sem token eram gravadas com token = "", e "Bearer " vazio na API
// de mensagens casava com elas. Token vazio passa a ser null.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`UPDATE "Whatsapps" SET token = NULL WHERE token IS NOT NULL AND trim(token) = ''`);
  },
  down: async () => {
    // Nada a desfazer: null e "" significam "sem token".
  }
};
