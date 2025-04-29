import { useState, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
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
  const [error, setError] = useState<string | null>(null);
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
      
      if (!result.success) {
        console.error('Analyze query error:', result.message);
        throw new Error(`Failed to analyze query: ${result.message}`);
      }
      
      // Extract dial color from the response if available
      const criteria: SearchCriteria = {};
      if (result.data && result.data['Dial Color']) {
        criteria.dial_color = result.data['Dial Color'];
      }
      
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
      // Step 1: Analyze the query using OpenAI to extract searchable categories
      const criteria = await analyzeQuery(query);
      setSearchCriteria(criteria);
      
      // Step 2: Search for watches using both structured criteria and vector embeddings
      const { data, error } = await supabase.rpc('search_watches_by_similarity', {
        query_text: query,
        similarity_threshold: 0.1  // Lower threshold to get more results
      });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        setWatches(data);
      } else {
        // If no results with similarity search, try dial color search
        if (criteria.dial_color) {
          const { data: colorData, error: colorError } = await supabase.rpc('search_watches_by_dial_color', {
            color_query: criteria.dial_color
          });
          
          if (colorError) {
            console.error('Dial color search error:', colorError);
          } else if (colorData && colorData.length > 0) {
            setWatches(colorData);
            return;
          }
        }
        
        setError('No watches found matching your criteria. Try a different search.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search watches. Please try again.');
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
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? 'Hide Filters' : 'Show Advanced Filters'}
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
      </MainContent>
    </Container>
  );
}

// Styled components
const Container = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const SearchSection = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 2rem;
`;

const SearchBox = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const SearchTextarea = styled.textarea`
  width: 100%;
  min-height: 60px;
  padding: 1rem;
  font-size: 1.1rem;
  border: 2px solid #ddd;
  border-radius: 10px;
  margin-bottom: 1rem;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #007bff;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const SearchButton = styled.button<{ primary?: boolean }>`
  padding: 1rem 2rem;
  font-size: 1.1rem;
  background-color: ${props => props.primary ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: 500;

  &:hover {
    background-color: ${props => props.primary ? '#0056b3' : '#5a6268'};
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const FilterButton = styled(SearchButton)`
  background-color: #6c757d;
  
  &:hover {
    background-color: #5a6268;
  }
`;

const FiltersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  font-weight: 500;
  color: #333;
`;

const FilterInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  
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
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`;

const CriteriaTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
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
  color: #495057;
  margin-right: 0.5rem;
`;

const CriteriaValue = styled.span`
  color: #212529;
`;

const ResultsSection = styled.div`
  margin-top: 3rem;
`;

const ResultsTitle = styled.h2`
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 1.5rem;
`;

const WatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
`;

const WatchCard = styled.div`
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: transform 0.2s ease-in-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
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
  color: #333;
`;

const WatchDetails = styled.p`
  margin: 0.25rem 0;
  color: #666;
  font-size: 0.9rem;
`;

const LimitedEdition = styled.span`
  background-color: #ffd700;
  color: #000;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  margin-left: 0.5rem;
`;
