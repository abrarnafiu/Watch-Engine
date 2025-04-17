import fetch from 'node-fetch';

async function testApi() {
  try {
    const response = await fetch('http://localhost:5000/api/analyze-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Find me a diving watch with a blue dial under $5000'
      }),
    });

    const data = await response.json();
    console.log('API Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testApi(); 