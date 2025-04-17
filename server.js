import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';

// Force reload of environment variables
const envPath = '.env';
const envConfig = dotenv.parse(fs.readFileSync(envPath));
Object.entries(envConfig).forEach(([key, value]) => {
  process.env[key] = value;
});

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Log the API key being used (first 10 characters only)
console.log('Using OpenAI API key:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'Not set');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API endpoint for analyzing queries
app.post('/api/analyze-query', async (req, res) => {
  try {
    console.log('Received analyze-query request:', req.body);
    const { query } = req.body;
    
    if (!query) {
      console.error('No query provided in request');
      return res.status(400).json({ message: 'No query provided' });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is missing');
      return res.status(500).json({ message: 'OpenAI API key is not configured' });
    }

    console.log('Processing query:', query);
    console.log('Using OpenAI API key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

    try {
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

      console.log('OpenAI response:', completion.choices[0].message.content);

      // Parse the response and extract structured criteria
      try {
        const criteria = JSON.parse(completion.choices[0].message.content || '{}');
        console.log('Parsed criteria:', criteria);
        return res.status(200).json(criteria);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Raw response:', completion.choices[0].message.content);
        return res.status(500).json({ 
          message: 'Error parsing OpenAI response',
          error: parseError.message
        });
      }
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return res.status(500).json({ 
        message: 'Error calling OpenAI API',
        error: openaiError.message || 'Unknown OpenAI error'
      });
    }
  } catch (error) {
    console.error('Unexpected error in analyze-query:', error);
    return res.status(500).json({ 
      message: 'Unexpected error processing query',
      error: error.message || 'Unknown error'
    });
  }
});

// API endpoint for finding watches using OpenAI
app.post('/api/search-watches', async (req, res) => {
  try {
    const criteria = req.body;
    console.log('Search criteria:', criteria);
    
    // Build a prompt for OpenAI to find watches based on the criteria
    let prompt = "You are a watch expert and stylist. Find 5 watches that match the following criteria:\n";
    
    // Add specific criteria to the prompt
    if (criteria.Type || criteria.type) {
      prompt += `- Type: ${criteria.Type || criteria.type}\n`;
    }
    
    if (criteria['Dial Color'] || criteria.dialColor) {
      prompt += `- Dial Color: ${criteria['Dial Color'] || criteria.dialColor}\n`;
    }
    
    if (criteria.Price || criteria['Price Range'] || criteria.price) {
      prompt += `- Price: ${criteria.Price || criteria['Price Range'] || criteria.price}\n`;
    }
    
    if (criteria.Style || criteria.style) {
      prompt += `- Style: ${criteria.Style || criteria.style}\n`;
    }
    
    if (criteria.Features || criteria.features) {
      const features = Array.isArray(criteria.Features || criteria.features) 
        ? (criteria.Features || criteria.features).join(', ') 
        : criteria.Features || criteria.features;
      prompt += `- Features: ${features}\n`;
    }
    
    if (criteria.Use || criteria.use) {
      prompt += `- Use: ${criteria.Use || criteria.use}\n`;
    }
    
    if (criteria.Audience || criteria.audience) {
      prompt += `- Audience: ${criteria.Audience || criteria.audience}\n`;
    }
    
    if (criteria.Appearance || criteria.appearance) {
      prompt += `- Appearance: ${criteria.Appearance || criteria.appearance}\n`;
    }
    
    if (criteria.Aesthetic || criteria.aesthetic) {
      prompt += `- Aesthetic: ${criteria.Aesthetic || criteria.aesthetic}\n`;
    }
    
    if (criteria.Versatility || criteria.versatility) {
      prompt += `- Versatility: ${criteria.Versatility || criteria.versatility}\n`;
    }
    
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
    
    prompt += "\nIMPORTANT: Return ONLY a valid JSON object with a 'watches' array. Do not include any explanatory text before or after the JSON.";
    prompt += "\nIMPORTANT: The watches MUST match the specific criteria provided. For example, if the type is 'smartwatch', only return smartwatches.";
    
    console.log('OpenAI prompt:', prompt);
    
    // Generate a random seed to get different results each time
    const randomSeed = Math.floor(Math.random() * 1000);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a watch expert. Find watches that match the given criteria and return them in the specified JSON format. ONLY return valid JSON with no additional text. The watches MUST match the specific criteria provided."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9, // Higher temperature for more variety
      seed: randomSeed, // Use a random seed to get different results
    });
    
    // Parse the response to get the watches
    const responseText = completion.choices[0].message.content || '{"watches": []}';
    console.log('OpenAI response:', responseText);
    
    // Try to parse the JSON response
    try {
      const data = JSON.parse(responseText);
      return res.status(200).json(data);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      
      // If parsing fails, try to extract JSON from the text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedData = JSON.parse(jsonMatch[0]);
          return res.status(200).json(extractedData);
        } catch (extractError) {
          console.error('Error parsing extracted JSON:', extractError);
        }
      }
      
      // If all parsing attempts fail, return an error
      return res.status(500).json({ 
        error: "Could not parse watch recommendations. Please try again with a different query."
      });
    }
  } catch (error) {
    console.error('Watch search error:', error);
    
    // Check if it's an API key error
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: "OpenAI API key is invalid. Please check your API key configuration."
      });
    }
    
    // For other errors
    return res.status(500).json({ 
      error: "Failed to search for watches. Please try again later."
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 