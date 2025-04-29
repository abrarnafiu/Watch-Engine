import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, schema } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const prompt = `Given the following search query about watches: "${query}"
    And the following database schema: ${JSON.stringify(schema)}
    
    Please analyze the query and extract relevant search criteria. Return a JSON object with the following fields:
    - model_name: The watch model name if mentioned
    - family_name: The watch family/collection name if mentioned
    - movement_name: The movement type if mentioned
    - function_name: The watch function if mentioned
    - year_produced: The year if mentioned
    - limited_edition: true/false if mentioned
    - price_eur_min: Minimum price if a range is mentioned
    - price_eur_max: Maximum price if a range is mentioned
    - dial_color: The dial color if mentioned
    - description: Any other relevant search terms
    
    Only include fields that are explicitly mentioned in the query.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes watch-related search queries and extracts structured search criteria."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
    });

    const criteria = JSON.parse(completion.choices[0].message.content || '{}');
    return res.status(200).json(criteria);
  } catch (error) {
    console.error('Error analyzing query:', error);
    return res.status(500).json({ error: 'Failed to analyze query' });
  }
} 