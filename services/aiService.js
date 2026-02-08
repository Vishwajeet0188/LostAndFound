// File: services/aiService.js
const OpenAI = require('openai');

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

class AIService {
  // Method 1: Enhance item description
  static async enhanceDescription(userInput) {
    try {
      const prompt = `Expand this brief item description into a detailed 1-2 sentence description for a lost-and-found listing. Make it clear and search-friendly.
      
      User input: "${userInput}"
      
      Enhanced description:`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("AI Enhancement Error:", error);
      return userInput; // Return original if AI fails
    }
  }

  // Method 2: Suggest category
  static async suggestCategory(description) {
    try {
      const prompt = `Categorize this lost/found item into exactly one of these categories: Electronics, Documents, Jewelry, Clothing, Bags, Keys, Pets, Other.
      
      Item description: "${description}"
      
      Category:`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 20
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("AI Category Error:", error);
      return "Other";
    }
  }
}

module.exports = AIService;