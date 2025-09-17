import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import styled from "styled-components";
import { supabase } from "../lib/supabaseClient";

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

const BrandPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [watches, setWatches] = useState<Watch[]>([]);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch brand name based on the id
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .select("name")
          .eq("id", id)
          .single();

        if (brandError || !brandData) {
          setError("Brand not found.");
          setLoading(false);
          return;
        }

        setBrandName(brandData.name);

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Fetch watches based on the brand_id
        const { data, error: watchError, count } = await supabase
          .from("watches")
          .select("*", { count: "exact" })
          .eq("brand_id", id)
          .range(from, to);

        if (watchError) {
          setError("Failed to load watches.");
          console.error("❌ Watch fetch error:", watchError.message);
          setLoading(false);
          return;
        }

        setWatches(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        setError("An unexpected error occurred.");
        console.error("❌ Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, page]);

  const totalPages = totalCount ? Math.ceil(totalCount / limit) : 1;

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    <Container>
      <Navbar />
      <Content>
        <Title>{brandName || "Loading..."} Watches</Title>
        {loading ? (
          <Loading>Loading watches...</Loading>
        ) : error ? (
          <Error>{error}</Error>
        ) : (
          <>
            <PaginationInfo>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount || 0)} of {totalCount} results
            </PaginationInfo>
            <WatchGrid>
              {watches.map((watch) => (
                <WatchCard key={watch.id} onClick={() => navigate(`/watch/${watch.id}`)}>
                  <WatchImage
                    src={watch.image_url || "/placeholder.jpg"}
                    alt={watch.model_name}
                  />
                  <WatchInfo>
                    <ModelName>{watch.model_name}</ModelName>
                    <FamilyName>{watch.family_name}</FamilyName>
                    <Details>
                      <Year>{watch.year_produced}</Year>
                      {watch.movement_name && <Movement>{watch.movement_name}</Movement>}
                      {watch.function_name && <Function>{watch.function_name}</Function>}
                      {watch.limited_edition && <LimitedEdition>{watch.limited_edition}</LimitedEdition>}
                      <Reference>Ref: {watch.reference}</Reference>
                    </Details>
                    {watch.price_eur && (
                      <Price>€{watch.price_eur.toLocaleString()}</Price>
                    )}
                  </WatchInfo>
                </WatchCard>
              ))}
            </WatchGrid>
            <PaginationControls>
              <PageButton disabled={page === 1} onClick={handlePrevPage}>
                Previous
              </PageButton>
              <PageText>
                Page {page} of {totalPages}
              </PageText>
              <PageButton disabled={page === totalPages} onClick={handleNextPage}>
                Next
              </PageButton>
            </PaginationControls>
          </>
        )}
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
`;

const Loading = styled.div`
  text-align: center;
  font-size: 1.2rem;
  color: #cccccc;
`;

const PaginationInfo = styled.div`
  text-align: center;
  margin-bottom: 1rem;
  color: #cccccc;
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
  cursor: pointer;

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

const PaginationControls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const PageText = styled.span`
  font-size: 1rem;
`;

const LimitedEdition = styled.p`
  margin: 0.2rem 0;
  color: #d4af37;
  font-weight: 500;
`;

export default BrandPage;
