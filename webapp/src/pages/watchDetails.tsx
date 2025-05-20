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

interface WatchList {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
 
const WatchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [watch, setWatch] = useState<Watch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [lists, setLists] = useState<WatchList[]>([]);
  const [newListName, setNewListName] = useState("");
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchWatch = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("watches")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching watch:", error);
          throw error;
        }

        if (!data) {
          setError("Watch not found");
          return;
        }

        setWatch(data);

        // Check if watch is in user's favorites
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: favoriteData, error: favoriteError } = await supabase
            .from("favorites")
            .select("id")
            .eq("user_id", user.id)
            .eq("watch_id", id)
            .maybeSingle();
          
          if (favoriteError) {
            console.error("Error checking favorite status:", favoriteError);
          } else {
            setIsFavorite(!!favoriteData);
          }
        }
      } catch (err) {
        console.error("Error in fetchWatch:", err);
        setError("Failed to load watch details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchWatch();
  }, [id]);

  const handleFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("watch_id", id);
        
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, watch_id: id });
        
        if (error) throw error;
      }

      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error("Error updating favorite:", err);
    }
  };

  const handleAddToList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch user's lists
      const { data: listsData, error: listsError } = await supabase
        .from("watch_lists")
        .select("*")
        .eq("user_id", user.id);

      if (listsError) throw listsError;
      setLists(listsData || []);
      setShowListModal(true);
    } catch (err) {
      console.error("Error fetching lists:", err);
    }
  };

  const handleCreateList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !newListName.trim()) return;

      const { data, error } = await supabase
        .from("watch_lists")
        .insert({ name: newListName, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Add watch to the new list
      await supabase
        .from("watch_list_items")
        .insert({ list_id: data.id, watch_id: id });

      setShowListModal(false);
      setNewListName("");
      setShowNewListInput(false);
    } catch (err) {
      console.error("Error creating list:", err);
    }
  };

  const handleAddToExistingList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from("watch_list_items")
        .insert({ list_id: listId, watch_id: id });

      if (error) throw error;
      setShowListModal(false);
    } catch (err) {
      console.error("Error adding to list:", err);
    }
  };

  // Get proxied image URL
  const getImageUrl = (url: string) => {
    if (imageError || !url) return "/placeholder.jpg";
    // Use the proxy endpoint
    return `${API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (loading) return <Loading>Loading...</Loading>;
  if (error) return <Error>{error}</Error>;
  if (!watch) return <Error>Watch not found</Error>;

  return (
    <Container>
      <Navbar />
      <Content>
        <WatchContainer>
          <ImageSection>
            <WatchImage 
              src={getImageUrl(watch.image_url)} 
              alt={watch.model_name}
              onError={handleImageError}
            />
          </ImageSection>
          <DetailsSection>
            <Title>{watch.model_name}</Title>
            <BrandName>{watch.family_name}</BrandName>
            <ActionButtons>
              <ActionButton onClick={handleFavorite}>
                {isFavorite ? "❤️" : "🤍"} Favorite
              </ActionButton>
              <ActionButton onClick={handleAddToList}>
                📋 Add to List
              </ActionButton>
            </ActionButtons>
            <StatsGrid>
              <StatItem>
                <StatLabel>Reference</StatLabel>
                <StatValue>{watch.reference}</StatValue>
              </StatItem>
              <StatItem>
                <StatLabel>Year</StatLabel>
                <StatValue>{watch.year_produced}</StatValue>
              </StatItem>
              {watch.movement_name && (
                <StatItem>
                  <StatLabel>Movement</StatLabel>
                  <StatValue>{watch.movement_name}</StatValue>
                </StatItem>
              )}
              {watch.function_name && (
                <StatItem>
                  <StatLabel>Function</StatLabel>
                  <StatValue>{watch.function_name}</StatValue>
                </StatItem>
              )}
              {watch.limited_edition && (
                <StatItem>
                  <StatLabel>Edition</StatLabel>
                  <StatValue>{watch.limited_edition}</StatValue>
                </StatItem>
              )}
              {watch.dial_color && (
                <StatItem>
                  <StatLabel>Dial Color</StatLabel>
                  <StatValue>{watch.dial_color}</StatValue>
                </StatItem>
              )}
              {watch.price_eur && (
                <StatItem>
                  <StatLabel>Price</StatLabel>
                  <StatValue>€{watch.price_eur.toLocaleString()}</StatValue>
                </StatItem>
              )}
            </StatsGrid>
            {watch.description && (
              <Description>
                <DescriptionTitle>Description</DescriptionTitle>
                <DescriptionText>{watch.description}</DescriptionText>
              </Description>
            )}
          </DetailsSection>
        </WatchContainer>
      </Content>

      {showListModal && (
        <ModalOverlay onClick={() => setShowListModal(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>Add to List</ModalTitle>
            <ModalContent>
              {lists.map(list => (
                <ListButton key={list.id} onClick={() => handleAddToExistingList(list.id)}>
                  {list.name}
                </ListButton>
              ))}
              {showNewListInput ? (
                <NewListInput>
                  <Input
                    type="text"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="Enter list name"
                  />
                  <ButtonGroup>
                    <Button onClick={handleCreateList}>Create</Button>
                    <Button onClick={() => setShowNewListInput(false)}>Cancel</Button>
                  </ButtonGroup>
                </NewListInput>
              ) : (
                <CreateListButton onClick={() => setShowNewListInput(true)}>
                  + Create New List
                </CreateListButton>
              )}
            </ModalContent>
          </Modal>
        </ModalOverlay>
      )}
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

const WatchContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const ImageSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const WatchImage = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: 8px;
`;

const DetailsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Title = styled.h1`
  margin: 0;
  color: #333;
  font-size: 2rem;
`;

const BrandName = styled.h2`
  margin: 0;
  color: #666;
  font-size: 1.5rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background-color: #f0f0f0;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const StatItem = styled.div`
  padding: 1rem;
  background-color: #f8f8f8;
  border-radius: 8px;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  color: #333;
  font-weight: 500;
`;

const Description = styled.div`
  margin-top: 2rem;
`;

const DescriptionTitle = styled.h3`
  color: #333;
  margin-bottom: 1rem;
`;

const DescriptionText = styled.p`
  color: #666;
  line-height: 1.6;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: #333;
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ListButton = styled.button`
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }
`;

const CreateListButton = styled.button`
  padding: 1rem;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;

  &:hover {
    border-color: #999;
    color: #333;
  }
`;

const NewListInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #007bff;
  color: white;

  &:hover {
    background-color: #0056b3;
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #666;
`;

const Error = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc3545;
  font-size: 1.2rem;
`;

export default WatchDetails; 