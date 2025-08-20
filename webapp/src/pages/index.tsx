import { useState, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import styled from 'styled-components';
import { supabase } from '../lib/supabaseClient';
import { API_URL } from '../config';

interface Watch {
  id: string;
  reference: string;
  model_name: string;
  family_name: string;
  movement_name: string | null;
  function_name: string | null;
  year_produced: string;
  limited_edition: string | null;
  price_eur: number | null;
  image_url: string;
  image_filename: string | null;
  description: string | null;
  dial_color: string | null;
  source: string | null;
  brand_id: number;
}

interface SearchCriteria {
  model_name?: string;
  family_name?: string;
  movement_name?: string;
  function_name?: string;
  year_produced?: string;
  limited_edition?: string;
  price_eur_min?: number;
  price_eur_max?: number;
  dial_color?: string;
  brand_id?: number;
  description?: string;
}

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [, setFilters] = useState<SearchCriteria>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight - 20}px`;
    }
  };

  const handleFilterChange = (key: keyof SearchCriteria, value: string | number | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const analyzeQuery = async (userQuery: string): Promise<SearchCriteria> => {
    try {
      console.log('Analyzing query:', userQuery);
      
      const response = await fetch(`${API_URL}/api/analyze-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: userQuery,
          schema: {
            model_name: "text",
            family_name: "text",
            movement_name: "text",
            function_name: "text",
            year_produced: "text",
            limited_edition: "text",
            price_eur: "numeric",
            dial_color: "text",
            description: "text"
          }
        }),
      });

      if (!response.ok) {
        console.error('Analyze query error:', response.status, response.statusText);
        throw new Error(`Failed to analyze query: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // The API returns the criteria directly as a JSON object
      console.log('API response:', result);
      
      // Check if the response has a data property
      const responseData = result.data || result;
      console.log('Response data to process:', responseData);
      
      // Map the API response to our SearchCriteria interface
      const criteria: SearchCriteria = {};
      
      // Map Type to model_name
      if (responseData.Type) {
        console.log('Found Type:', responseData.Type);
        criteria.model_name = responseData.Type;
      }
      
      // Map Dial Color to dial_color
      if (responseData['Dial Color']) {
        console.log('Found Dial Color:', responseData['Dial Color']);
        criteria.dial_color = responseData['Dial Color'];
      }
      
      // Map Price to price_eur_max
      if (responseData.Price) {
        console.log('Found Price:', responseData.Price);
        const priceStr = responseData.Price.toString().toLowerCase();
        if (priceStr.includes('under') || priceStr.includes('less than')) {
          const priceValue = parseInt(priceStr.replace(/[^0-9]/g, ''));
          if (!isNaN(priceValue)) {
            console.log('Setting price_eur_max to:', priceValue);
            criteria.price_eur_max = priceValue;
          }
        } else if (priceStr.includes('over') || priceStr.includes('more than')) {
          const priceValue = parseInt(priceStr.replace(/[^0-9]/g, ''));
          if (!isNaN(priceValue)) {
            console.log('Setting price_eur_min to:', priceValue);
            criteria.price_eur_min = priceValue;
          }
        } else if (priceStr.includes('-') || priceStr.includes('to')) {
          const priceRange = priceStr.split(/[-to]/).map((p: string) => parseInt(p.replace(/[^0-9]/g, '')));
          if (priceRange.length === 2 && !isNaN(priceRange[0]) && !isNaN(priceRange[1])) {
            console.log('Setting price range:', priceRange[0], 'to', priceRange[1]);
            criteria.price_eur_min = priceRange[0];
            criteria.price_eur_max = priceRange[1];
          }
        } else {
          const priceValue = parseInt(priceStr.replace(/[^0-9]/g, ''));
          if (!isNaN(priceValue)) {
            console.log('Setting price_eur_max to:', priceValue);
            criteria.price_eur_max = priceValue;
          }
        }
      }
      
      // Remove undefined properties
      Object.keys(criteria).forEach(key => {
        if (criteria[key as keyof SearchCriteria] === undefined) {
          delete criteria[key as keyof SearchCriteria];
        }
      });
      
      console.log('Processed search criteria:', criteria);
      return criteria;
    } catch (error) {
      console.error('Error analyzing query:', error);
      // Return empty criteria instead of throwing
      return {};
    }
  };

  const searchWatches = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setWatches([]);
    
    try {
      const criteria = await analyzeQuery(query);
      setSearchCriteria(criteria);
      
      // Step 2: Build a base query with all the search criteria
      let supabaseQuery = supabase.from('watches').select('*');
      
      // Apply filters based on search criteria
      if (criteria.model_name) {
        console.log('Adding model_name filter:', criteria.model_name);
        // Use case-insensitive partial match
        supabaseQuery = supabaseQuery.ilike('model_name', `%${criteria.model_name.toLowerCase()}%`);
      }
      if (criteria.family_name) {
        console.log('Adding family_name filter:', criteria.family_name);
        supabaseQuery = supabaseQuery.ilike('family_name', `%${criteria.family_name}%`);
      }
      if (criteria.year_produced) {
        console.log('Adding year_produced filter:', criteria.year_produced);
        supabaseQuery = supabaseQuery.eq('year_produced', criteria.year_produced);
      }
      if (criteria.movement_name) {
        console.log('Adding movement_name filter:', criteria.movement_name);
        supabaseQuery = supabaseQuery.ilike('movement_name', `%${criteria.movement_name}%`);
      }
      if (criteria.function_name) {
        console.log('Adding function_name filter:', criteria.function_name);
        supabaseQuery = supabaseQuery.ilike('function_name', `%${criteria.function_name}%`);
      }
      if (criteria.limited_edition !== undefined) {
        console.log('Adding limited_edition filter:', criteria.limited_edition);
        supabaseQuery = supabaseQuery.eq('limited_edition', criteria.limited_edition);
      }
      if (criteria.price_eur_min) {
        console.log('Adding price_eur_min filter:', criteria.price_eur_min);
        supabaseQuery = supabaseQuery.gte('price_eur', criteria.price_eur_min);
      }
      if (criteria.price_eur_max) {
        console.log('Adding price_eur_max filter:', criteria.price_eur_max);
        supabaseQuery = supabaseQuery.lte('price_eur', criteria.price_eur_max);
      }
      if (criteria.description) {
        console.log('Adding description filter:', criteria.description);
        supabaseQuery = supabaseQuery.ilike('description', `%${criteria.description}%`);
      }
      if (criteria.dial_color) {
        console.log('Adding dial_color filter:', criteria.dial_color);
        // Use case-insensitive partial match
        supabaseQuery = supabaseQuery.ilike('dial_color', `%${criteria.dial_color.toLowerCase()}%`);
      }
      
      // Execute the query
      console.log('Executing filtered query...');
      
      // Check if we have any filters applied
      const hasFilters = Object.keys(criteria).length > 0;
      console.log('Has filters applied:', hasFilters);
      
      if (!hasFilters) {
        console.log('No filters applied, skipping filtered query');
        // If no filters, go straight to vector similarity search
        const { data, error } = await supabase.rpc('search_watches_by_similarity', {
          query_text: query,
          similarity_threshold: 0.1  // Lower threshold to get more results
        });
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Vector similarity search results:', data?.length || 0, 'items');
        
        if (data && data.length > 0) {
          setWatches(data);
        } else {
          setError('No watches found matching your criteria. Try a different search.');
        }
        return;
      }
      
      const { data: filteredData, error: filteredError } = await supabaseQuery;
      
      if (filteredError) {
        console.error('Supabase filtered query error:', filteredError);
        throw filteredError;
      }
      
      console.log('Filtered query results:', filteredData?.length || 0, 'items');
      
      // If we have filtered results, use them
      if (filteredData && filteredData.length > 0) {
        console.log('Using filtered results');
        setWatches(filteredData);
        return;
      }
      
      // If no filtered results, fall back to vector similarity search
      console.log('No filtered results, falling back to vector similarity search');
      const { data, error } = await supabase.rpc('search_watches_by_similarity', {
        query_text: query,
        similarity_threshold: 0.1  // Lower threshold to get more results
      });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Vector similarity search results:', data?.length || 0, 'items');
      
      if (data && data.length > 0) {
        setWatches(data);
      } else {
        setError('No watches found matching your criteria. Try a different search.');
      }
    } catch (err) {
      console.error('Search error:', err);
      if (err instanceof Error) {
        if (err.message.includes('daily search limit')) {
          if (err.message.includes('Please sign up or log in')) {
            setError(
              <div>
                {err.message}
                <br />
                <LoginPrompt>
                  <LoginButton onClick={() => navigate('/login')}>Log In</LoginButton>
                  <SignupButton onClick={() => navigate('/login?mode=signup')}>Sign Up</SignupButton>
                </LoginPrompt>
              </div>
            );
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to search watches. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWatchClick = (watchId: string) => {
    navigate(`/watch/${watchId}`);
  };

  return (
    <Container>
      <Navbar />
      <MainContent>
        <SearchSection>
          <Title>Find Your Perfect Watch</Title>
          <Subtitle>
            Describe the watch you're looking for in natural language, or use our advanced filters below.
            For example: "Find me a diving watch with a blue dial under $5000"
          </Subtitle>
          <SearchBox>
            <SearchTextarea
              ref={textareaRef}
              placeholder="Describe your ideal watch..."
              value={query}
              onChange={handleChange}
            />
            <ButtonContainer>
              <SearchButton 
                onClick={searchWatches}
                disabled={loading || !query.trim()}
              >
                {loading ? 'Searching...' : 'Search Watches'}
              </SearchButton>
              <FilterButton 
                aria-label={showAdvancedFilters ? 'Hide filters' : 'Show filters'}
                title={showAdvancedFilters ? 'Hide filters' : 'Show filters'}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7V5z" />
                </svg>
              </FilterButton>
            </ButtonContainer>
          </SearchBox>
        </SearchSection>

        {showAdvancedFilters && (
          <FiltersContainer>
            <FilterGroup>
              <FilterLabel>Price Range (EUR)</FilterLabel>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <FilterInput
                  type="number"
                  placeholder="Min"
                  onChange={(e) => handleFilterChange('price_eur_min', Number(e.target.value))}
                />
                <FilterInput
                  type="number"
                  placeholder="Max"
                  onChange={(e) => handleFilterChange('price_eur_max', Number(e.target.value))}
                />
              </div>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Year Range</FilterLabel>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <FilterInput
                  type="number"
                  placeholder="Min"
                  onChange={(e) => handleFilterChange('year_produced', e.target.value)}
                />
              </div>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Movement</FilterLabel>
              <FilterInput
                type="text"
                placeholder="Movement name"
                onChange={(e) => handleFilterChange('movement_name', e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Function</FilterLabel>
              <FilterInput
                type="text"
                placeholder="Function name"
                onChange={(e) => handleFilterChange('function_name', e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Dial Color</FilterLabel>
              <FilterInput
                type="text"
                placeholder="Dial color"
                onChange={(e) => handleFilterChange('dial_color', e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Limited Edition</FilterLabel>
              <FilterSelect
                onChange={(e) => handleFilterChange('limited_edition', e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </FilterSelect>
            </FilterGroup>
          </FiltersContainer>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {loading && <LoadingSpinner>Searching...</LoadingSpinner>}

        {searchCriteria && (
          <SearchCriteriaDisplay>
            <CriteriaTitle>Search Criteria:</CriteriaTitle>
            <CriteriaList>
              {Object.entries(searchCriteria).map(([key, value]) => {
                if (key === 'embedding_query') return null;
                if (!value) return null;
                
                const formattedKey = key
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                
                // Convert value to string if it's an object
                const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                
                return (
                  <CriteriaItem key={key}>
                    <CriteriaKey>{formattedKey}:</CriteriaKey>
                    <CriteriaValue>{displayValue}</CriteriaValue>
                  </CriteriaItem>
                );
              })}
            </CriteriaList>
          </SearchCriteriaDisplay>
        )}

        {watches.length > 0 && (
          <ResultsSection>
            <ResultsTitle>Matching Watches</ResultsTitle>
            <WatchGrid>
              {watches.map((watch) => (
                <WatchCard key={watch.id} onClick={() => handleWatchClick(watch.id)}>
                  <WatchImage src={watch.image_url || "/placeholder.jpg"} alt={watch.model_name} />
                  <WatchInfo>
                    <WatchTitle>
                      {watch.model_name}
                      {watch.limited_edition && <LimitedEdition>Limited Edition</LimitedEdition>}
                    </WatchTitle>
                    <WatchDetails>{watch.family_name}</WatchDetails>
                    <WatchDetails>Year: {watch.year_produced}</WatchDetails>
                    <WatchDetails>Movement: {watch.movement_name}</WatchDetails>
                    <WatchDetails>Function: {watch.function_name}</WatchDetails>
                    {watch.price_eur && (
                      <WatchDetails>Price: €{watch.price_eur.toLocaleString()}</WatchDetails>
                    )}
                  </WatchInfo>
                </WatchCard>
              ))}
            </WatchGrid>
          </ResultsSection>
        )}

        {/* In-page About Section */}
        <AboutSection id="about">
          <AboutTitle>About Watch Engine</AboutTitle>
          <AboutGrid>
            <AboutCard>
              <h3>What is Watch Engine?</h3>
              <p>
              The Watch Search Engine is a powerful platform that helps users discover the best watches available
              on the market. With access to a vast database of watch brands and models, it allows users to search, 
              compare, and explore watches based on their preferences.
              </p>
            </AboutCard>
            <AboutCard>
              <h3>How it works</h3>
              <p>
              The platform aggregates data from various watch manufacturers' websites using web scraping techniques. 
              Information such as brand, model, price, features, and images are collected and stored in a MongoDB 
              database. This data is then made accessible via an intuitive user interface.
              </p>
            </AboutCard>
            <AboutCard>
              <h3>Our mission</h3>
              <p>
                We aim to provide users with a fast and seamless experience when searching for watches, ensuring they 
                have all the details they need to make an informed decision.
              </p>
            </AboutCard>
          </AboutGrid>
        </AboutSection>
      </MainContent>
      <Footer/>
    </Container>
  );
}

// Styled components
const Container = styled.div`
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #1a1a2e 0%,rgb(25, 33, 54) 25%, #0f0f23 50%, #0a0a0a 100%);
  background-attachment: fixed;
  position: relative;
  overflow-x: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100vh;
    background: radial-gradient(circle at top center, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.15) 30%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    opacity: 0;
    animation: fadeInLight 1.5s ease-in-out forwards;
  }
  
  @keyframes fadeInLight {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
`;

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const SearchSection = styled.div`
  text-align: center;
  margin-top: 3rem;
  margin-bottom: 3rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 3rem 2rem;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(255, 255, 255, 0.25);
  border: 2px solid rgba(255, 255, 255, 0.7);
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 200;
  font-family: 'Montserrat', sans-serif;
  color: rgb(255, 255, 255);
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const Subtitle = styled.p`
  color:rgb(126, 136, 141);
  font-size: 1rem;
  font-weight: 400;
  font-family: 'Inter', sans-serif;
  margin-bottom: 2.5rem;
  line-height: 1.6;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  letter-spacing: 0.01em;
`;

const SearchBox = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const SearchTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 1.5rem;
  font-size: 1.2rem;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  border: 3px solid rgba(33, 150, 243, 0.2);
  border-radius: 20px;
  margin-bottom: 1.5rem;
  resize: none;
  outline: none;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);

  &:focus {
    border-color:rgb(146, 173, 196);
    box-shadow: 0 8px 32px rgba(33, 150, 243, 0.3);
    transform: translateY(-2px);
  }

  &::placeholder {
    color: #999;
    font-style: italic;
    font-weight: 300;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
`;

const SearchButton = styled.button<{ primary?: boolean }>`
  padding: 1.3rem 3rem;
  font-size: 1.2rem;
  min-height: 56px;
  font-family: 'Inter', sans-serif;
  font-weight: 300;
  background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 50%, #2196f3 100%);
  color: white;
  border: none;
  border-radius: 28px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(33, 150, 243, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(33, 150, 243, 0.6);
  }

  &:active {
    transform: translateY(-1px);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const FilterButton = styled(SearchButton)`
  padding: 0;
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  box-shadow: 0 8px 20px rgba(108, 117, 125, 0.35);
  text-transform: none;
  letter-spacing: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  svg {
    width: 22px;
    height: 22px;
    fill: #fff;
  }

  &:hover {
    box-shadow: 0 12px 28px rgba(108, 117, 125, 0.45);
    transform: translateY(-2px) scale(1.05);
  }
`;

const FiltersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  color: #333;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
`;

const FilterInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #666;
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  text-align: center;
  padding: 1rem;
  margin: 1rem 0;
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #dc3545;
`;

const SearchCriteriaDisplay = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 20px;
  margin-bottom: 2rem;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const CriteriaTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.01em;
`;

const CriteriaList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
`;

const CriteriaItem = styled.div`
  display: flex;
  align-items: center;
  background: #f8f9fa;
  padding: 0.5rem 1rem;
  border-radius: 20px;
`;

const CriteriaKey = styled.span`
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  color: #495057;
  margin-right: 0.5rem;
  font-size: 0.9rem;
`;

const CriteriaValue = styled.span`
  color: #212529;
`;

const ResultsSection = styled.div`
  margin-top: 3rem;
  margin-bottom: 4rem;
`;

const ResultsTitle = styled.h2`
  font-size: 2.2rem;
  color: white;
  margin-bottom: 2rem;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  font-weight: 800;
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.01em;
`;

const WatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
`;

const WatchCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  transition: all 0.3s ease-in-out;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);

  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 25px 50px rgba(0,0,0,0.15);
  }
`;

const WatchImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const WatchInfo = styled.div`
  padding: 1rem;
`;

const WatchTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  color: #333;
  letter-spacing: 0.01em;
`;

const WatchDetails = styled.p`
  margin: 0.25rem 0;
  color: #666;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  line-height: 1.4;
`;

const LimitedEdition = styled.span`
  background-color: #ffd700;
  color: #000;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  margin-left: 0.5rem;
`;

const LoginPrompt = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const LoginButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background-color: #0056b3;
  }
`;

const SignupButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background-color: #218838;
  }
`;

// About section styles matching theme
const AboutSection = styled.section`
  margin-top: 10rem;
  margin-bottom: 6rem;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  scroll-margin-top: 80px;
`;

const AboutTitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  font-family: 'Montserrat', sans-serif;
  margin: 0 0 1.5rem 0;
  color: rgb(0, 0, 0);
  background-clip: text;
`;

const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const AboutCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);

  h3 {
    margin: 0 0 0.5rem 0;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    color: #333;
  }

  p {
    margin: 0;
    color: #555;
    line-height: 1.6;
    font-family: 'Inter', sans-serif;
  }
`;

