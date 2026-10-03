// testWhatsAppNotification.js
import axios from 'axios';

/**
 * Função para testar o envio de mensagens WhatsApp via Evolution API
 * @param {Object} testData - Dados de teste para simular um cadastro
 * @returns {Promise} - Resultado da requisição
 */
export const testWhatsAppNotification = async (testData = null) => {
  // Dados de exemplo se não forem fornecidos
  const defaultTestData = {
    name: "Empresa Teste",
    email: "teste@exemplo.com",
    phone: "(11) 99999-9999",
    planId: "1"
  };

  // Use os dados fornecidos ou os dados padrão
  const userData = testData || defaultTestData;
  
  try {
    // Obtém variáveis de ambiente
    const evolutionApiUrl = process.env.REACT_APP_EVOLUTION_API_URL;
    const adminWhatsApp = process.env.REACT_APP_ADMIN_WHATSAPP;
    const instanceName = process.env.REACT_APP_EVOLUTION_INSTANCE;
    const apiKey = process.env.REACT_APP_EVOLUTION_API_KEY;
    
    // Verifica se todas as variáveis de ambiente estão configuradas
    if (!evolutionApiUrl || !adminWhatsApp || !instanceName || !apiKey) {
      console.error("Erro: Variáveis de ambiente não configuradas corretamente");
      console.log({
        evolutionApiUrl,
        adminWhatsApp,
        instanceName,
        apiKey: apiKey ? "***" : undefined
      });
      return { success: false, error: "Variáveis de ambiente não configuradas" };
    }
    
    // Monta a mensagem com os dados do cadastro (TESTE)
    const message = `*TESTE - Novo Cadastro*\n\n*Empresa:* ${userData.name}\n*Email:* ${userData.email}\n*Telefone:* ${userData.phone}\n*Plano:* ${userData.planId}\n*Data:* ${new Date().toLocaleString('pt-BR')}`;
    
    console.log("Tentando enviar mensagem de teste para:", adminWhatsApp);
    console.log("Mensagem:", message);
    
    // Estrutura do payload para a Evolution API
    const payload = {
      number: adminWhatsApp,
      text: message
    };
    
    // Envia a requisição para a Evolution API
    const response = await axios.post(
      `${evolutionApiUrl}/message/sendText/${instanceName}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        }
      }
    );
    
    console.log("✅ Teste de notificação WhatsApp enviada com sucesso:", response.data);
    return {
      success: true,
      data: response.data,
      message: "Mensagem de teste enviada com sucesso"
    };
  } catch (error) {
    console.error("❌ Erro ao enviar notificação WhatsApp de teste:", error);
    console.error("Detalhes do erro:", error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
};