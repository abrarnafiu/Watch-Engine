import { supabase } from './supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { User } from '@supabase/supabase-js';

// Constants for search limits
const FREE_SEARCHES_BEFORE_SIGNUP = 3;
const FREE_SEARCHES_AFTER_SIGNUP = 17;

// Utility function to check and update search count
export async function checkAndUpdateSearchCount(userId: string | null) {
  if (!userId) {
    // For anonymous users, check if they've exceeded the free search limit
    const searchCount = localStorage.getItem('anonymousSearchCount');
    const count = searchCount ? parseInt(searchCount) : 0;
    
    if (count >= FREE_SEARCHES_BEFORE_SIGNUP) {
      throw new Error('Please sign up to continue searching');
    }
    
    localStorage.setItem('anonymousSearchCount', (count + 1).toString());
    return;
  }

  // For authenticated users
  const { data: searchCountData, error } = await supabase
    .from('user_search_counts')
    .select('search_count')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If no record exists, create one
    if (error.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('user_search_counts')
        .insert([{ user_id: userId, search_count: 1 }]);
      
      if (insertError) throw insertError;
      return;
    }
    throw error;
  }

  if (searchCountData.search_count >= FREE_SEARCHES_AFTER_SIGNUP) {
    throw new Error('You have reached your search limit. Please upgrade to continue searching.');
  }

  // Update search count
  const { error: updateError } = await supabase
    .from('user_search_counts')
    .update({ search_count: searchCountData.search_count + 1 })
    .eq('user_id', userId);

  if (updateError) throw updateError;
}

// Utility function to call the analyze-query API endpoint
export async function analyzeQuery(query: string, schema: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await checkAndUpdateSearchCount(user?.id || null);

    const response = await fetch('/api/analyze-query', {
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