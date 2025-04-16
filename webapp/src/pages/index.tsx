import { useState, useRef } from 'react';
import Navbar from '../components/navbar';
import styled from 'styled-components';

interface Watch {
  watchId: number;
  makeName: string;
  modelName: string;
  familyName: string;
  yearProducedName: string;
  url: string;
  priceInEuro: string;
  movementName: string | null;
  functionName: string | null;
  reference: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight - 20}px`;
    }
  };

  const searchWatches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const openAIResponse = await fetch('http://localhost:5000/api/analyze-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!openAIResponse.ok) {
        throw new Error(`API error: ${openAIResponse.status}`);
      }

      const analysis = await openAIResponse.json();
      console.log('Analysis:', analysis);

      // Temporarily comment out the watch search until we get the analysis working
      /*const watchResponse = await fetch('http://localhost:5000/api/search-watches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysis),
      });

      const matchedWatches = await watchResponse.json();
      setWatches(matchedWatches);*/
    } catch (err) {
      setError('Failed to search watches. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Navbar />
      <MainContent>
        <SearchSection>
          <Title>Find Your Perfect Watch</Title>
          <Subtitle>
            Describe the watch you're looking for in natural language. 
            For example: "Find me a diving watch with a blue dial under $5000"
          </Subtitle>
          <SearchBox>
            <SearchTextarea
              ref={textareaRef}
              placeholder="Describe your ideal watch..."
              value={query}
              onChange={handleChange}
            />
            <SearchButton 
              onClick={searchWatches}
              disabled={loading || !query.trim()}
            >
              {loading ? 'Searching...' : 'Search Watches'}
            </SearchButton>
          </SearchBox>
        </SearchSection>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {watches.length > 0 && (
          <ResultsSection>
            <ResultsTitle>Matching Watches</ResultsTitle>
            <WatchGrid>
              {watches.map((watch) => (
                <WatchCard key={watch.watchId}>
                  <WatchImage src={watch.url} alt={watch.modelName} />
                  <WatchInfo>
                    <BrandName>{watch.makeName}</BrandName>
                    <ModelName>{watch.modelName}</ModelName>
                    <Details>
                      <Year>{watch.yearProducedName}</Year>
                      {watch.priceInEuro && <Price>€{watch.priceInEuro}</Price>}
                    </Details>
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

const SearchButton = styled.button`
  padding: 1rem 2rem;
  font-size: 1.1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
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

  &:hover {
    transform: translateY(-5px);
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

const BrandName = styled.h3`
  margin: 0;
  color: #007bff;
  font-size: 1.2rem;
`;

const ModelName = styled.p`
  margin: 0.5rem 0;
  color: #333;
  font-size: 1.1rem;
`;

const Details = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
`;

const Year = styled.span`
  color: #666;
`;

const Price = styled.span`
  color: #28a745;
  font-weight: bold;
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
