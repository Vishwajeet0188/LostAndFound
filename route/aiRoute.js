// File: routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Check if OpenAI API key is available
const hasOpenAIKey = process.env.OPENAI_API_KEY && 
                     process.env.OPENAI_API_KEY.trim() !== '' && 
                     process.env.OPENAI_API_KEY !== 'your-api-key-here';

// Initialize OpenAI only if key exists
let openai;
if (hasOpenAIKey) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI initialized with API key');
} else {
  console.log('⚠️ OpenAI API key not found. Using mock responses.');
}

// Simple test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'AI Routes working!',
    openaiConfigured: hasOpenAIKey,
    note: hasOpenAIKey ? 'OpenAI API is configured' : 'Using mock responses - add OPENAI_API_KEY to .env',
    timestamp: new Date().toISOString()
  });
});

// POST /api/ai/enhance-description
router.post('/enhance-description', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    console.log('Enhancing description:', text.substring(0, 50) + '...');
    
    // If no OpenAI key, use enhanced mock
    if (!hasOpenAIKey) {
      const enhancedText = getSmartMockEnhancement(text);
      return res.json({ 
        original: text, 
        enhanced: enhancedText,
        note: 'Using smart mock enhancement. Add OPENAI_API_KEY to .env for real AI.',
        source: 'Mock AI'
      });
    }
    
    // REAL OpenAI API call
    try {
      console.log('Calling OpenAI API...');
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that improves lost item descriptions. 
            Make them more detailed, clear, and search-friendly. 
            Include: color, brand, material, size, distinguishing features.
            Keep it concise (2-3 sentences maximum).`
          },
          {
            role: "user",
            content: `Please enhance this lost item description: "${text}"`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      
      const enhancedText = completion.choices[0].message.content.trim();
      console.log('OpenAI response received');
      
      res.json({ 
        original: text, 
        enhanced: enhancedText,
        source: 'OpenAI GPT-3.5 Turbo'
      });
      
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError.message);
      // Fallback to smart mock if OpenAI fails
      const enhancedText = getSmartMockEnhancement(text);
      res.json({ 
        original: text, 
        enhanced: enhancedText,
        error: 'OpenAI failed, using smart fallback',
        source: 'Fallback AI'
      });
    }
    
  } catch (error) {
    console.error('Enhance description error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance description',
      details: error.message 
    });
  }
});

// POST /api/ai/suggest-category
router.post('/suggest-category', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    console.log('Suggesting category for:', description.substring(0, 50) + '...');
    
    // If no OpenAI key, use smart mock
    if (!hasOpenAIKey) {
      const suggestedCategory = getSmartCategorySuggestion(description);
      return res.json({ 
        description, 
        suggestedCategory,
        note: 'Using smart mock suggestion. Add OPENAI_API_KEY for AI suggestions.',
        source: 'Mock AI'
      });
    }
    
    // REAL OpenAI API call for category suggestion
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You suggest categories for lost items. 
            Choose ONLY ONE from these exact categories: Electronics, Documents, Jewelry, Clothing, Bags, Keys, Other.
            Return just the single category name, nothing else.`
          },
          {
            role: "user",
            content: `Based on this lost item description, suggest the most appropriate category: "${description}"`
          }
        ],
        max_tokens: 20,
        temperature: 0.3
      });
      
      let suggestedCategory = completion.choices[0].message.content.trim();
      
      // Validate category is in our list
      const validCategories = ['Electronics', 'Documents', 'Jewelry', 'Clothing', 'Bags', 'Keys', 'Other'];
      if (!validCategories.includes(suggestedCategory)) {
        suggestedCategory = getSmartCategorySuggestion(description);
      }
      
      res.json({ 
        description, 
        suggestedCategory,
        source: 'OpenAI GPT-3.5 Turbo'
      });
      
    } catch (openaiError) {
      console.error('OpenAI Category Error:', openaiError.message);
      const suggestedCategory = getSmartCategorySuggestion(description);
      res.json({ 
        description, 
        suggestedCategory,
        error: 'OpenAI failed, using smart fallback',
        source: 'Fallback AI'
      });
    }
    
  } catch (error) {
    console.error('Suggest category error:', error);
    res.status(500).json({ 
      error: 'Failed to suggest category',
      details: error.message 
    });
  }
});

// SMART MOCK ENHANCEMENT FUNCTION - IMPROVED VERSION
function getSmartMockEnhancement(text) {
  const lowerText = text.toLowerCase();
  
  // Define BETTER enhancement patterns with ACTUAL enhancement
  const patterns = [
    {
      keywords: ['specs', 'glasses', 'sunglass', 'lenskart', 'eyewear', 'spectacle'],
      enhancement: (original) => {
        // Extract details from original text
        const hasBlack = lowerText.includes('black') ? 'matte black' : 'dark colored';
        const hasRectangular = lowerText.includes('rectangular') ? 'rectangular/wayfarer style' : 'standard shape';
        const brand = lowerText.includes('lenskart') ? 'Lenskart brand ' : 'branded ';
        
        return `${original}\n\n**Enhanced AI Description:**\nA ${brand}eyeglass with ${hasBlack} frame in ${hasRectangular}. Features include anti-reflective coating, durable hinges, and adjustable nose pads. Comes with a protective hard case and microfiber cleaning cloth. Ideal for daily wear with UV protection.`;
      }
    },
    {
      keywords: ['phone', 'mobile', 'iphone', 'samsung', 'android', 'smartphone'],
      enhancement: (original) => {
        const isiPhone = lowerText.includes('iphone');
        const color = lowerText.includes('black') ? 'midnight black' : 
                     lowerText.includes('white') ? 'starlight white' :
                     lowerText.includes('blue') ? 'sierra blue' : 'standard color';
        
        return `${original}\n\n**Enhanced AI Description:**\n${isiPhone ? 'Apple iPhone' : 'Smartphone'} in ${color} finish. Features a high-resolution display, multiple cameras, and facial recognition/Fingerprint ID. Likely has a protective case and screen guard. Contains personal data, apps, and contacts.`;
      }
    },
    {
      keywords: ['wallet', 'purse', 'money', 'card', 'leather'],
      enhancement: (original) => {
        const isLeather = lowerText.includes('leather') ? 'genuine leather' : 'synthetic material';
        const color = lowerText.includes('black') ? 'jet black' :
                     lowerText.includes('brown') ? 'cognac brown' :
                     lowerText.includes('blue') ? 'navy blue' : 'standard color';
        
        return `${original}\n\n**Enhanced AI Description:**\nA ${color} ${isLeather} wallet with multiple card slots (8-12), transparent ID window, zippered coin compartment, and billfold section. Features RFID blocking technology and a slim profile design. May contain cards, cash, and identification.`;
      }
    },
    {
      keywords: ['key', 'keychain', 'remote', 'fob', 'lock'],
      enhancement: (original) => {
        const isCar = lowerText.includes('car') ? 'car key with remote' : 'key';
        const hasRemote = lowerText.includes('remote') ? 'with remote lock/unlock' : '';
        
        return `${original}\n\n**Enhanced AI Description:**\n${isCar} ${hasRemote} on a durable keychain. Typically includes 2-4 keys (house, office, locker) and may have a distinctive key fob or tag. Keys are usually brass or nickel-plated with specific cuts for corresponding locks.`;
      }
    },
    {
      keywords: ['book', 'notebook', 'diary', 'textbook', 'novel'],
      enhancement: (original) => {
        const isTextbook = lowerText.includes('textbook') ? 'academic textbook' : 'book';
        const condition = lowerText.includes('new') ? 'new condition' : 
                         lowerText.includes('old') ? 'gently used' : 'good condition';
        
        return `${original}\n\n**Enhanced AI Description:**\n${isTextbook} in ${condition}. Features include a paperback/hardcover binding, 200-500 pages, possibly with highlighted text, margin notes, or bookmarks. May have library stamps, barcode, or personal inscriptions inside cover.`;
      }
    },
    {
      keywords: ['bag', 'backpack', 'laptop bag', 'handbag', 'briefcase'],
      enhancement: (original) => {
        const type = lowerText.includes('laptop') ? 'laptop backpack' :
                    lowerText.includes('hand') ? 'handbag' :
                    lowerText.includes('brief') ? 'briefcase' : 'backpack';
        
        return `${original}\n\n**Enhanced AI Description:**\nDurable ${type} with multiple compartments (main, laptop sleeve, front organizer, side pockets). Water-resistant material, padded shoulder straps, and branded zippers. Suitable for daily commute, school, or office use.`;
      }
    }
  ];
  
  // Find matching pattern and apply enhancement
  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword)) {
        return pattern.enhancement(text);
      }
    }
  }
  
  // DEFAULT ENHANCEMENT - Actually enhances the text
  return enhanceGenericItem(text, lowerText);
}

// Function to enhance generic items
function enhanceGenericItem(text, lowerText) {
  // Extract common details
  const colorMatch = lowerText.match(/(black|white|blue|red|green|yellow|pink|purple|gray|silver|gold|brown)/);
  const color = colorMatch ? colorMatch[1] + ' colored' : 'standard color';
  
  const sizeMatch = lowerText.match(/(small|medium|large|big|tiny|compact)/);
  const size = sizeMatch ? sizeMatch[1] + ' sized' : 'regular size';
  
  const materialMatch = lowerText.match(/(leather|metal|plastic|wood|fabric|rubber|silicon)/);
  const material = materialMatch ? materialMatch[1] + ' material' : 'standard material';
  
  return `${text}\n\n**Enhanced AI Description:**\nA ${size} item in ${color} made of ${material}. Features practical design for everyday use. Look for brand logos, serial numbers, wear patterns, or unique markings that can help with identification.`;
}

// SMART CATEGORY SUGGESTION FUNCTION
function getSmartCategorySuggestion(description) {
  const lowerDesc = description.toLowerCase();
  const categories = [
    { name: 'Electronics', keywords: ['phone', 'laptop', 'charger', 'tablet', 'earphone', 'camera', 'watch', 'device'] },
    { name: 'Documents', keywords: ['document', 'passport', 'license', 'certificate', 'aadhaar', 'pan', 'id', 'card'] },
    { name: 'Jewelry', keywords: ['ring', 'necklace', 'bracelet', 'chain', 'gold', 'silver', 'diamond', 'watch'] },
    { name: 'Clothing', keywords: ['shirt', 'pant', 'jacket', 'shoe', 'dress', 'cap', 'uniform', 'cloth'] },
    { name: 'Bags', keywords: ['bag', 'backpack', 'purse', 'wallet', 'briefcase', 'handbag', 'luggage'] },
    { name: 'Keys', keywords: ['key', 'keychain', 'remote', 'fob', 'lock'] }
  ];
  
  // Count matches for each category
  let bestCategory = 'Other';
  let maxMatches = 0;
  
  for (const category of categories) {
    let matches = 0;
    for (const keyword of category.keywords) {
      if (lowerDesc.includes(keyword)) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestCategory = category.name;
    }
  }
  
  return bestCategory;
}

module.exports = router;