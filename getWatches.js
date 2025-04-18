require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const headers = {
  'x-rapidapi-key': 'your-api-key',
  'x-rapidapi-host': 'watch-database1.p.rapidapi.com'
};

async function fetchMakes() {
  const response = await axios.get('https://watch-database1.p.rapidapi.com/make', { headers });
  return response.data;
}

async function fetchWatchesByMakeId(makeId, page = 1) {
  const url = `https://watch-database1.p.rapidapi.com/watches/make/${makeId}/page/${page}/limit/20`;
  const response = await axios.get(url, { headers });
  return response.data;
}

async function insertWatchesToSupabase(watches) {
  const { error } = await supabase.from('watches').insert(watches);
  if (error) {
    console.error('Insert error:', error);
  }
}

async function main() {
  const makes = await fetchMakes();

  for (const make of makes) {
    console.log(`Processing make: ${make.makeName} (ID: ${make.makeId})`);
    let page = 1;
    let totalPages = 1;

    do {
      const data = await fetchWatchesByMakeId(make.makeId, page);
      totalPages = data.allPages;
      const watches = data.watches.map(w => ({
        watch_id: w.watchId,
        make: w.makeName,
        model: w.modelName,
        family: w.familyName,
        year_produced: w.yearProducedName,
        limited: w.limitedName === 'Yes',
        movement: w.movementName,
        functions: w.functionName,
        price: w.priceInEuro || null,
        reference: w.reference,
        image_url: w.url
      }));

      await insertWatchesToSupabase(watches);
      console.log(`Page ${page}/${totalPages} for make ${make.makeName} done.`);

      page++;
    } while (page <= totalPages);
  }

  console.log('Done importing all watches!');
}

main().catch(console.error);
