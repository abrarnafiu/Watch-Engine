import { OpenAI } from 'openai';  // Import OpenAI class
import axios from 'axios';
import { supabase } from './webapp/src/lib/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

// SETTINGS
const MAKE_ID = 30;
const LIMIT = 20;
const TABLE_NAME = 'watches';
const BASE_URL = 'https://watch-database1.p.rapidapi.com/watches/make';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure your OpenAI API key is in the .env file
});

// Helper function to extract dial color from model name
function extractDialColorFromModelName(modelName) {
  const parts = modelName.split('/');
  const dialColor = parts[parts.length - 1].trim();
  return dialColor || null;
}

// Function to generate embeddings using OpenAI API
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 512  // optional — reduces cost & storage size
    });
    

    // Return the embedding (an array of numbers)
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    return null;
  }
}

async function fetchAndInsertAllPages() {
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/${MAKE_ID}/page/${page}/limit/${LIMIT}`;
    const options = {
      method: 'GET',
      url,
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'watch-database1.p.rapidapi.com',
      }
    };

    try {
      const response = await axios.request(options);
      const watches = response.data.watches;

      if (!watches || watches.length === 0) {
        console.log(`✅ No more data on page ${page}. Finished.`);
        break;
      }

      const insertBatch = [];

      for (const w of watches) {
        if (!w.modelName) {
          console.log(`⏭️ Skipping watch with missing model: ${w.reference || 'unknown reference'}`);
          continue;
        }

        // Extract dial color from the modelName
        const dialColor = extractDialColorFromModelName(w.modelName);

        // Generate the embedding for the model name or description
        const embeddingText = `${w.modelName} ${w.familyName || ''} ${w.movementName || ''}`;
        const embedding = await generateEmbedding(embeddingText);

        // Map the watch data to the new schema
        insertBatch.push({
          reference: w.reference || null,
          brand_id: MAKE_ID, // Use MAKE_ID as the brand_id instead of make_name
          model_name: w.modelName,
          family_name: w.familyName || null,
          movement_name: w.movementName || null,
          function_name: w.functionName || null,
          year_produced: w.yearProducedName || null,
          limited_edition: w.limitedName || null,
          price_eur: parseFloat(w.priceInEuro) || null,
          image_url: w.url || null,
          image_filename: w.watchImageName || null,
          description: w.descriptionContent || null,
          dial_color: dialColor,  // Extracted from model name
          raw_data: w,  // Store raw API data (optional)
          source: 'Watch Database API',
          embedding: embedding, // Store the generated embedding here
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        });
      }

      if (insertBatch.length === 0) {
        console.log(`⚠️ No valid watches to insert on page ${page}`);
      } else {
        const { error } = await supabase
          .from(TABLE_NAME)
          .upsert(insertBatch);

        if (error) {
          console.error(`❌ Insert error on page ${page}:`, error);
          break;
        }

        console.log(`✅ Inserted ${insertBatch.length} watches from page ${page}`);
      }

      page++;
      await new Promise(res => setTimeout(res, 1100)); // respect rate limit

    } catch (err) {
      console.error(`❌ Fetch error on page ${page}:`, err.message);
      break;
    }
  }
}

fetchAndInsertAllPages();
