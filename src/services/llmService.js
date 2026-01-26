const fetch = require('node-fetch');

class LLMService {
  async callLLMWithModel({ model, messages, temperature = 0.7, max_tokens = 512 }) {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error('LLM API key is not configured');
    
    const apiUrl = 'https://chat-ai.academiccloud.de/v1/chat/completions';
    const selectedModel = model || process.env.LLM_MODEL || 'llama-3.3-70b-instruct';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature,
        max_tokens
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }
}

module.exports = new LLMService();
