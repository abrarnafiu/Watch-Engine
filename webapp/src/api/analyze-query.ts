import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

export interface SearchCriteria {
  model_name?: string;
  family_name?: string;
  movement_name?: string;
  function_name?: string;
  year_produced?: string;
  limited_edition?: boolean;
  price_eur_min?: number;
  price_eur_max?: number;
  dial_color?: string;
  brand_id?: number;
  description?: string;
}

export async function analyzeQuery(query: string, schema: any): Promise<SearchCriteria> {
  try {
    const prompt = `Analyze the following watch-related search query and extract relevant search criteria based on this database schema:
${JSON.stringify(schema, null, 2)}

Query: "${query}"

Return a JSON object with ONLY the relevant search criteria. For example:
- For "blue diving watch under $5000": { "dial_color": "blue", "function_name": "diving", "price_eur_max": 5000 }
- For "limited edition chronograph from 2020": { "limited_edition": true, "function_name": "chronograph", "year_produced": "2020" }
- For "automatic watch with moonphase": { "movement_name": "automatic", "function_name": "moonphase" }

Return ONLY the JSON object, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes watch-related search queries and extracts relevant search criteria."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
    });

    const result = response.choices[0].message.content;
    if (!result) throw new Error('No response from OpenAI');

    return JSON.parse(result);
  } catch (error) {
    console.error('Error analyzing query:', error);
    throw error;
  }
} 