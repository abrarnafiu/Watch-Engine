import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Utility function to call the analyze-query API endpoint
async function analyzeQuery(query: string, schema: any) {
  try {
    const response = await fetch(`${API_URL}/api/analyze-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, schema }),
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling analyze-query API:', error);
    throw error;
  }
}

export interface SearchResult {
  id: string;
  model_name: string;
  family_name: string;
  movement_name: string;
  function_name: string;
  year_produced: string;
  limited_edition: boolean;
  price_eur: number;
  image_url: string;
  description: string;
  dial_color: string;
  similarity_score?: number;
}

export async function searchWatches(query: string): Promise<SearchResult[]> {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;

    // If user is logged in, check their search limit
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      
      // First, try to get the current search count
      const { data: searchData, error: searchError } = await supabase
        .from('user_searches')
        .select('search_count')
        .eq('user_id', user.id)
        .eq('search_date', today)
        .single();

      if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw searchError;
      }

      const DAILY_SEARCH_LIMIT = 2; // Set your desired daily limit here
      const currentCount = searchData?.search_count || 0;

      if (currentCount >= DAILY_SEARCH_LIMIT) {
        throw new Error(`You have reached your daily search limit of ${DAILY_SEARCH_LIMIT} searches. Please try again tomorrow.`);
      }

      // Update or insert the search count using a transaction
      const { error: upsertError } = await supabase
        .from('user_searches')
        .upsert({
          user_id: user.id,
          search_date: today,
          search_count: currentCount + 1
        }, {
          onConflict: 'user_id,search_date'
        });

      if (upsertError) throw upsertError;
    }

    // Get schema for OpenAI analysis
    const { data: schemaData, error: schemaError } = await supabase
      .from('watches')
      .select('*')
      .limit(1);

    if (schemaError) throw schemaError;

    // Analyze query to extract searchable categories
    const searchCriteria = await analyzeQuery(query, schemaData[0]);

    // Build the base query
    let supabaseQuery = supabase.from('watches').select('*');

    // Apply category-based filters
    if (searchCriteria.model_name) {
      supabaseQuery = supabaseQuery.ilike('model_name', `%${searchCriteria.model_name}%`);
    }
    if (searchCriteria.family_name) {
      supabaseQuery = supabaseQuery.ilike('family_name', `%${searchCriteria.family_name}%`);
    }
    if (searchCriteria.year_produced) {
      supabaseQuery = supabaseQuery.eq('year_produced', searchCriteria.year_produced);
    }
    if (searchCriteria.movement_name) {
      supabaseQuery = supabaseQuery.ilike('movement_name', `%${searchCriteria.movement_name}%`);
    }
    if (searchCriteria.function_name) {
      supabaseQuery = supabaseQuery.ilike('function_name', `%${searchCriteria.function_name}%`);
    }
    if (searchCriteria.limited_edition !== undefined) {
      supabaseQuery = supabaseQuery.eq('limited_edition', searchCriteria.limited_edition);
    }
    if (searchCriteria.price_eur_min) {
      supabaseQuery = supabaseQuery.gte('price_eur', searchCriteria.price_eur_min);
    }
    if (searchCriteria.price_eur_max) {
      supabaseQuery = supabaseQuery.lte('price_eur', searchCriteria.price_eur_max);
    }
    if (searchCriteria.description) {
      supabaseQuery = supabaseQuery.ilike('description', `%${searchCriteria.description}%`);
    }
    if (searchCriteria.dial_color) {
      supabaseQuery = supabaseQuery.ilike('dial_color', `%${searchCriteria.dial_color}%`);
    }
    if (searchCriteria.brand_id) {
      supabaseQuery = supabaseQuery.eq('brand_id', searchCriteria.brand_id);
    }

    // Execute the category-based search
    const { data: categoryResults, error: categoryError } = await supabaseQuery;
    if (categoryError) throw categoryError;

    // If we have category matches, return them
    if (categoryResults && categoryResults.length > 0) {
      return categoryResults;
    }

    // If no category matches, fall back to vector similarity search
    const { data: vectorResults, error: vectorError } = await supabase.rpc('search_watches_by_similarity', {
      query_text: query,
      similarity_threshold: 0.7
    });

    if (vectorError) throw vectorError;

    return vectorResults || [];
  } catch (error) {
    console.error('Error in searchWatches:', error);
    throw error;
  }
} 