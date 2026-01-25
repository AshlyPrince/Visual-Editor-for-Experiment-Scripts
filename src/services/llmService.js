const fetch = require('node-fetch');

class LLMService {
  async callLLMWithModel({ model, messages, temperature = 0.7, max_tokens = 512 }) {
    const apiKey = process.env.LLM_API_KEY;
    const apiUrl = 'https://chat-ai.academiccloud.de/v1/chat/completions';
    const defaultModel = process.env.LLM_MODEL || 'llama-3.3-70b-instruct';
    const selectedModel = model || defaultModel;
    
    if (!apiKey) {
      throw new Error('LLM API key is not configured');
    }
    
    const requestBody = {
      model: selectedModel,
      messages,
      temperature,
      max_tokens
    };
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('LLM Service error:', error.message);
      throw error;
    }
  }
}

module.exports = new LLMService();
