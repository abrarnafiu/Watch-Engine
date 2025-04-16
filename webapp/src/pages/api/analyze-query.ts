import OpenAI from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a watch expert. Extract search criteria from user queries into structured data."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.7,
    });

    // Parse the response and extract structured criteria
    const criteria = JSON.parse(completion.choices[0].message.content || '{}');
    
    return res.status(200).json(criteria);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return res.status(500).json({ message: 'Error processing query' });
  }
} 