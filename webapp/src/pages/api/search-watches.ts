import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const criteria = req.body;
    
    // Use the criteria to search the watch database
    const response = await fetch(
      'https://watch-database1.p.rapidapi.com/watches/search',
      {
        method: 'POST',
        headers: {
          'x-rapidapi-host': 'watch-database1.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
          'Content-Type': 'application/json',
        } as HeadersInit,
        body: JSON.stringify(criteria),
      }
    );

    const watches = await response.json();
    return res.status(200).json(watches);
  } catch (error) {
    console.error('Watch search error:', error);
    return res.status(500).json({ message: 'Error searching watches' });
  }
} 