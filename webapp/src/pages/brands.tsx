import React, { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { supabase } from "../lib/supabaseClient";

interface Brand {
  id: number;
  name: string;
}

const BrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from("brands")
          .select("id, name")
          .order("name")
          .limit(1000);

        if (error) {
          console.error("Error fetching brands:", error);
          setError("Failed to load brands. Please try again.");
          return;
        }

        if (!data || data.length === 0) {
          setError("No brands found");
          return;
        }

        setBrands(data);
      } catch (err) {
        console.error("Error in fetchBrands:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBrands = filteredBrands.reduce((acc: { [key: string]: Brand[] }, brand) => {
    const firstLetter = brand.name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(brand);
    return acc;
  }, {});

  if (loading) {
    return (
      <Container>
        <Navbar />
        <Content>
          <LoadingMessage>Loading brands...</LoadingMessage>
        </Content>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Navbar />
        <Content>
          <ErrorMessage>{error}</ErrorMessage>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Navbar />
      <Content>
        <Title>Watch Brands</Title>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        {Object.entries(groupedBrands).sort().map(([letter, brandList]) => (
          <Section key={letter}>
            <LetterDivider>
              <Letter>{letter}</Letter>
              <Line />
            </LetterDivider>
            <BrandGrid>
              {brandList.map((brand) => (
                <BrandCard key={brand.id}>
                  <StyledLink to={`/brand/${brand.id}`}>
                    {brand.name}
                  </StyledLink>
                </BrandCard>
              ))}
            </BrandGrid>
          </Section>
        ))}
      </Content>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #1a1a2e 0%,rgb(25, 33, 54) 25%, #0f0f23 50%, #0a0a0a 100%);
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  text-align: center;
  color: #ffffff;
  margin-bottom: 2rem;
  font-size: 2.5rem;
`;

const BrandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
`;

const BrandCard = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: translateY(-5px);
  }
`;

const StyledLink = styled(Link)`
  display: block;
  padding: 1.5rem;
  text-align: center;
  color: #333;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 500;

  &:hover {
    color: #007bff;
  }
`;

const SearchContainer = styled.div`
  margin: 0 auto 2rem;
  max-width: 600px;
  padding: 0 1rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #007bff;
  }
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const LetterDivider = styled.div`
  display: flex;
  align-items: center;
  margin: 2rem 0 1rem;
`;

const Letter = styled.span`
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
  margin-right: 1rem;
  min-width: 30px;
`;

const Line = styled.div`
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #007bff, #e0e0e0);
`;

const LoadingMessage = styled.div`
  text-align: center;
  font-size: 1.2rem;
  color: #cccccc;
  margin-top: 2rem;
`;

const ErrorMessage = styled.div`
  text-align: center;
  font-size: 1.2rem;
  color: #dc3545;
  margin-top: 2rem;
  padding: 1rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`;

export default BrandsPage;
