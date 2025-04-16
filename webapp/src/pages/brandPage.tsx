// BrandPage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import styled from "styled-components";

interface Watch {
  watchId: number;
  modelName: string;
  familyName: string;
  yearProducedName: string;
  url: string;
  priceInEuro: string;
  makeName: string;
  movementName: string | null;
  functionName: string | null;
  reference: string;
}

const BrandPage: React.FC = () => {
  const { brand } = useParams<{ brand: string }>();
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWatches = async () => {
      try {
        const response = await fetch(
          `https://watch-database1.p.rapidapi.com/watches/make/${brand}/page/1/limit/20`,
          {
            headers: {
              'x-rapidapi-host': 'watch-database1.p.rapidapi.com',
              'x-rapidapi-key': 'd067d98502msh30077ab58dee88cp1dac59jsn11c24a207fe7'
            }
          }
        );
        const data = await response.json();
        setWatches(data.watches);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching watches:", error);
        setError("Failed to load watches. Please try again later.");
        setLoading(false);
      }
    };

    if (brand) {
      fetchWatches();
    }
  }, [brand]);

  if (error) {
    return (
      <Container>
        <Navbar />
        <Content>
          <Error>{error}</Error>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Navbar />
      <Content>
        <Title>{watches[0]?.makeName || 'Loading...'} Watches</Title>
        {loading ? (
          <Loading>Loading watches...</Loading>
        ) : (
          <WatchGrid>
            {watches.map((watch) => (
              <WatchCard key={watch.watchId}>
                <WatchImage src={watch.url} alt={watch.modelName} />
                <WatchInfo>
                  <ModelName>{watch.modelName}</ModelName>
                  <FamilyName>{watch.familyName}</FamilyName>
                  <Details>
                    <Year>{watch.yearProducedName}</Year>
                    {watch.movementName && <Movement>{watch.movementName}</Movement>}
                    {watch.functionName && <Function>{watch.functionName}</Function>}
                    <Reference>Ref: {watch.reference}</Reference>
                  </Details>
                  {watch.priceInEuro && (
                    <Price>€{watch.priceInEuro}</Price>
                  )}
                </WatchInfo>
              </WatchCard>
            ))}
          </WatchGrid>
        )}
      </Content>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
`;

const Loading = styled.div`
  text-align: center;
  font-size: 1.2rem;
  color: #666;
`;

const WatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  padding: 1rem;
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

const ModelName = styled.h3`
  margin: 0;
  color: #333;
  font-size: 1.1rem;
`;

const FamilyName = styled.p`
  color: #666;
  margin: 0.5rem 0;
`;

const Year = styled.p`
  color: #888;
  margin: 0.5rem 0;
  font-size: 0.9rem;
`;

const Price = styled.p`
  color: #007bff;
  font-weight: bold;
  margin: 0.5rem 0;
`;

const Error = styled.div`
  text-align: center;
  color: #dc3545;
  font-size: 1.2rem;
  margin: 2rem 0;
`;

const Details = styled.div`
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #666;
`;

const Movement = styled.p`
  margin: 0.2rem 0;
`;

const Function = styled.p`
  margin: 0.2rem 0;
`;

const Reference = styled.p`
  margin: 0.2rem 0;
  font-family: monospace;
`;

export default BrandPage;
