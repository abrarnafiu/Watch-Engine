import React, { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { Link } from "react-router-dom";
import styled from "styled-components";

interface Brand {
  makeId: number;
  makeName: string;
}

const BrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const API_URL = "https://watch-database1.p.rapidapi.com/make";
  const API_HEADERS = {
    "x-rapidapi-host": "watch-database1.p.rapidapi.com",
    "x-rapidapi-key": "d067d98502msh30077ab58dee88cp1dac59jsn11c24a207fe7",
  };

  useEffect(() => {
    const cachedBrands = localStorage.getItem("watchBrands");

    if (cachedBrands) {
      try {
        const parsed = JSON.parse(cachedBrands);
        if (Array.isArray(parsed) && parsed.every(b => b && b.makeId && b.makeName)) {
          setBrands(parsed);
        } else {
          // If cached data is invalid, fetch fresh data
          fetchBrands();
        }
      } catch (e) {
        // If parsing fails, fetch fresh data
        fetchBrands();
      }
    } else {
      fetchBrands();
    }
  }, []);

  const fetchBrands = () => {
    fetch(API_URL, { headers: API_HEADERS })
      .then((response) => response.json())
      .then((data) => {
        const brandData = data.make
          .filter((b: any): b is Brand => b && b.makeId && b.makeName)
          .sort((a: Brand, b: Brand) => a.makeName.localeCompare(b.makeName));
        setBrands(brandData);
        localStorage.setItem("watchBrands", JSON.stringify(brandData));
      })
      .catch((error) => console.error("Error fetching watch brands:", error));
  };

  const filteredBrands = brands.filter(brand =>
    brand.makeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBrands = filteredBrands.reduce((acc: { [key: string]: Brand[] }, brand) => {
    const firstLetter = brand.makeName.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(brand);
    return acc;
  }, {});

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
                <BrandCard key={brand.makeId}>
                  <StyledLink to={`/brand/${brand.makeId}`}>
                    {brand.makeName}
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

export default BrandsPage;
