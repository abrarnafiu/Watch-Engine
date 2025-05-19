import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// CORS configuration
const corsOptions = {
  origin: ['https://watch-engine.onrender.com', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(limiter);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Error response helper
const errorResponse = (res, status, message, error = null) => {
  const response = {
    success: false,
    message,
    ...(error && { error: error.message })
  };
  return res.status(status).json(response);
};

// Success response helper
const successResponse = (res, data) => {
  return res.status(200).json({
    success: true,
    data
  });
};

// API endpoint for analyzing queries
app.post('/api/analyze-query', async (req, res) => {
  try {
    console.log('Received analyze-query request:', req.body);
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return errorResponse(res, 400, 'Invalid query parameter');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return errorResponse(res, 500, 'OpenAI API key is not configured');
    }

    console.log('Processing query:', query);

    // For simple queries like "Find me a watch", return a default response
    if (query.toLowerCase().trim() === 'find me a watch' || 
        query.toLowerCase().trim() === 'show me watches' ||
        query.toLowerCase().trim() === 'watches') {
      return successResponse(res, {
        'Dial Color': null,
        'Type': 'any',
        'Price': null,
        'Style': 'any',
        'Features': null,
        'Use': 'any',
        'Audience': 'any',
        'Appearance': 'any',
        'Aesthetic': 'any',
        'Versatility': 'any'
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a watch expert. Extract search criteria from user queries into structured data. Return a JSON object with the following properties: Type, 'Dial Color', Price, Style, Features, Use, Audience, Appearance, Aesthetic, Versatility. If a property is not mentioned in the query, omit it from the JSON."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      return errorResponse(res, 500, 'No response from OpenAI');
    }

    try {
      const criteria = JSON.parse(responseContent);
      return successResponse(res, criteria);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return errorResponse(res, 500, 'Error parsing OpenAI response', parseError);
    }
  } catch (error) {
    console.error('Unexpected error in analyze-query:', error);
    return errorResponse(res, 500, 'Unexpected error processing query', error);
  }
});

// API endpoint for finding watches using OpenAI
app.post('/api/search-watches', async (req, res) => {
  try {
    const criteria = req.body;
    if (!criteria || typeof criteria !== 'object') {
      return errorResponse(res, 400, 'Invalid search criteria');
    }

    console.log('Search criteria:', criteria);
    
    let prompt = "You are a watch expert and stylist. Find 5 watches that match the following criteria:\n";
    
    // Add specific criteria to the prompt
    const criteriaMapping = {
      Type: 'type',
      'Dial Color': 'dialColor',
      Price: 'price',
      Style: 'style',
      Features: 'features',
      Use: 'use',
      Audience: 'audience',
      Appearance: 'appearance',
      Aesthetic: 'aesthetic',
      Versatility: 'versatility'
    };

    Object.entries(criteriaMapping).forEach(([key, value]) => {
      if (criteria[key] || criteria[value]) {
        const criteriaValue = criteria[key] || criteria[value];
        prompt += `- ${key}: ${Array.isArray(criteriaValue) ? criteriaValue.join(', ') : criteriaValue}\n`;
      }
    });
    
    prompt += "\nFor each watch, provide the following information in JSON format:\n";
    prompt += "- watchId (a number)\n";
    prompt += "- makeName (brand name)\n";
    prompt += "- modelName (model name)\n";
    prompt += "- familyName (category like Diving, Chronograph, etc.)\n";
    prompt += "- yearProducedName (year)\n";
    prompt += "- url (image URL)\n";
    prompt += "- priceInEuro (price in euros)\n";
    prompt += "- movementName (movement type)\n";
    prompt += "- functionName (function type)\n";
    prompt += "- reference (reference number)\n";
    
    prompt += "\nIMPORTANT: Return ONLY a valid JSON object with a 'watches' array. Do not include any explanatory text.";
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a watch expert. Find watches that match the given criteria and return them in the specified JSON format. ONLY return valid JSON with no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      return errorResponse(res, 500, 'No response from OpenAI');
    }

    try {
      const data = JSON.parse(responseContent);
      return successResponse(res, data);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return errorResponse(res, 500, 'Error parsing watch recommendations', parseError);
    }
  } catch (error) {
    console.error('Watch search error:', error);
    if (error.code === 'invalid_api_key') {
      return errorResponse(res, 401, 'OpenAI API key is invalid');
    }
    return errorResponse(res, 500, 'Failed to search for watches', error);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 