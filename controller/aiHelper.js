const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateAIData(text) {
  const prompt = `
  Improve this lost/found item description and return:
  - description
  - category
  - keywords (array)

  Text: "${text}"

  Return ONLY valid JSON.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }]
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { generateAIData };
