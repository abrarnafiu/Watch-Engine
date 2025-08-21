import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/navbar';
import styled from 'styled-components';
import type { WatchPreferences } from '../types/supabase';

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

interface Favorite {
  watch_id: string;
}

interface WatchList {
  id: string;
  name: string;
  items: Watch[];
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState<WatchPreferences>({
    user_id: '',
    preferred_brands: [],
    price_range_min: 0,
    price_range_max: 50000,
    preferred_styles: [],
    preferred_features: [],
    preferred_materials: [],
    preferred_complications: [],
    dial_colors: [],
    case_sizes: [],
    bio: '',
    name: '',
    profile_image: null,
  });
  const [favorites, setFavorites] = useState<Watch[]>([]);
  const [lists, setLists] = useState<WatchList[]>([]);
  const [activeTab, setActiveTab] = useState<'preferences' | 'favorites' | 'lists'>('preferences');

  // Predefined options for selections
  const watchStyles = ['Dress', 'Sport', 'Dive', 'Pilot', 'Field', 'Racing', 'Smart'];
  const materials = ['Stainless Steel', 'Gold', 'Titanium', 'Ceramic', 'Carbon Fiber', 'Bronze'];
  const complications = ['Chronograph', 'GMT', 'Perpetual Calendar', 'Moon Phase', 'Tourbillon'];
  const colors = ['Black', 'White', 'Blue', 'Green', 'Silver', 'Gold', 'Brown'];

  useEffect(() => {
    fetchProfile();
    fetchFavorites();
    fetchLists();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('watch_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPreferences(data);
      } else {
        // Initialize with user_id if no preferences exist
        setPreferences(prev => ({ ...prev, user_id: user.id }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function fetchFavorites() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('favorites')
        .select('watch_id')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const watchIds = data.map((fav: Favorite) => fav.watch_id);
        
        const { data: watchesData, error: watchesError } = await supabase
          .from('watches')
          .select('*')
          .in('id', watchIds);

        if (watchesError) throw watchesError;
        setFavorites(watchesData || []);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }

  async function fetchLists() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('watch_lists')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        // Fetch watches for each list
        const listsWithWatches = await Promise.all(
          data.map(async (list: WatchList) => {
            const { data: itemsData, error: itemsError } = await supabase
              .from('watch_list_items')
              .select('watch_id')
              .eq('list_id', list.id);

            if (itemsError) throw itemsError;

            if (itemsData && itemsData.length > 0) {
              const watchIds = itemsData.map((item: Favorite) => item.watch_id);
              
              const { data: watchesData, error: watchesError } = await supabase
                .from('watches')
                .select('*')
                .in('id', watchIds);

              if (watchesError) throw watchesError;
              
              return {
                ...list,
                items: watchesData || []
              };
            }
            
            return {
              ...list,
              items: []
            };
          })
        );

        setLists(listsWithWatches);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('watch_preferences')
        .upsert({
          ...preferences,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Check file size (max 5MB)
      if (selectedImage.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      // Check file type
      if (!selectedImage.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Upload image to Supabase Storage
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const {error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        if (uploadError.message.includes('duplicate')) {
          // If file exists, try again with a different timestamp
          const newFileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: retryError } = await supabase.storage
            .from('profile-pictures')
            .upload(newFileName, selectedImage, {
              cacheControl: '3600',
              upsert: true
            });
          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('watch_preferences')
        .update({ profile_image: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setPreferences(prev => ({ ...prev, profile_image: publicUrl }));
      setIsEditingProfile(false);
      setSelectedImage(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (watchId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('watch_id', watchId);

      if (error) throw error;
      
      // Update local state
      setFavorites(prev => prev.filter(watch => watch.id !== watchId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const removeFromList = async (listId: string, watchId: string) => {
    try {
      const { error } = await supabase
        .from('watch_list_items')
        .delete()
        .eq('list_id', listId)
        .eq('watch_id', watchId);

      if (error) throw error;
      
      // Update local state
      setLists(prevLists => 
        prevLists.map(list => {
        if (list.id === listId) {
          return {
            ...list,
              items: list.items.filter(watch => watch.id !== watchId)
          };
        }
        return list;
        })
      );
    } catch (error) {
      console.error('Error removing watch from list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('watch_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
      
      // Update local state
      setLists(prev => prev.filter(list => list.id !== listId));
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  if (loading) return <Loading>Loading...</Loading>;

  return (
    <Container>
      <Navbar />
      <Content>
        <ProfileHeader>
          <Banner />
          <ProfileInfo>
            <ProfilePicture>
              <ProfileImage 
                src={preferences.profile_image || '/profile-placeholder.png'} 
                alt={preferences.name || 'Profile'} 
              />
              <EditProfilePictureButton onClick={() => setIsEditingProfile(true)}>
                <EditIcon>📷</EditIcon>
              </EditProfilePictureButton>
            </ProfilePicture>
            <ProfileDetails>
              <Name>{preferences.name || 'Add your name'}</Name>
              <Bio>{preferences.bio || 'No bio added yet'}</Bio>
            </ProfileDetails>
          </ProfileInfo>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </ProfileHeader>

        {isEditingProfile && (
          <ModalOverlay onClick={() => setIsEditingProfile(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Change Profile Picture</ModalTitle>
                <CloseButton onClick={() => setIsEditingProfile(false)}>×</CloseButton>
              </ModalHeader>
              <ModalContent>
                {previewUrl ? (
                  <ImagePreview src={previewUrl} alt="Preview" />
                ) : (
                  <UploadArea onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon>📁</UploadIcon>
                    <UploadText>Click to select an image</UploadText>
                    <UploadSubtext>or drag and drop</UploadSubtext>
                  </UploadArea>
                )}
                <HiddenInput
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                />
                {previewUrl && (
                  <ButtonGroup>
                    <SaveButton onClick={handleImageUpload} disabled={loading}>
                      {loading ? 'Uploading...' : 'Upload Image'}
                    </SaveButton>
                    <CancelButton onClick={() => {
                      setSelectedImage(null);
                      setPreviewUrl(null);
                    }}>
                      Cancel
                    </CancelButton>
                  </ButtonGroup>
                )}
              </ModalContent>
            </Modal>
          </ModalOverlay>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <TabsContainer>
          <Tab 
            active={activeTab === 'preferences'} 
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </Tab>
          <Tab 
            active={activeTab === 'favorites'} 
            onClick={() => setActiveTab('favorites')}
          >
            Favorites ({favorites.length})
          </Tab>
          <Tab 
            active={activeTab === 'lists'} 
            onClick={() => setActiveTab('lists')}
          >
            Lists ({lists.length})
          </Tab>
        </TabsContainer>

        {activeTab === 'preferences' && (
          <PreferencesForm>
            <SectionHeader>
              <SectionTitle>Watch Preferences</SectionTitle>
              {!isEditingPreferences && (
                <EditButton onClick={() => setIsEditingPreferences(true)}>
                  Edit Preferences
                </EditButton>
              )}
            </SectionHeader>

            {isEditingPreferences ? (
              <>
                <Section>
                  <SectionTitle>Price Range</SectionTitle>
                  <PriceRangeContainer>
                    <PriceInput
                      type="number"
                      value={preferences.price_range_min}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        price_range_min: parseInt(e.target.value)
                      }))}
                      placeholder="Min Price"
                    />
                    <span>to</span>
                    <PriceInput
                      type="number"
                      value={preferences.price_range_max}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        price_range_max: parseInt(e.target.value)
                      }))}
                      placeholder="Max Price"
                    />
                  </PriceRangeContainer>
                </Section>

                <Section>
                  <SectionTitle>Watch Styles</SectionTitle>
                  <OptionsGrid>
                    {watchStyles.map(style => (
                      <Checkbox
                        key={style}
                        checked={preferences.preferred_styles.includes(style)}
                        onChange={(e) => {
                          setPreferences(prev => ({
                            ...prev,
                            preferred_styles: e.target.checked
                              ? [...prev.preferred_styles, style]
                              : prev.preferred_styles.filter(s => s !== style)
                          }));
                        }}
                        label={style}
                      />
                    ))}
                  </OptionsGrid>
                </Section>

                <Section>
                  <SectionTitle>Materials</SectionTitle>
                  <OptionsGrid>
                    {materials.map(material => (
                      <Checkbox
                        key={material}
                        checked={preferences.preferred_materials.includes(material)}
                        onChange={(e) => {
                          setPreferences(prev => ({
                            ...prev,
                            preferred_materials: e.target.checked
                              ? [...prev.preferred_materials, material]
                              : prev.preferred_materials.filter(m => m !== material)
                          }));
                        }}
                        label={material}
                      />
                    ))}
                  </OptionsGrid>
                </Section>

                <Section>
                  <SectionTitle>Complications</SectionTitle>
                  <OptionsGrid>
                    {complications.map(complication => (
                      <Checkbox
                        key={complication}
                        checked={preferences.preferred_complications.includes(complication)}
                        onChange={(e) => {
                          setPreferences(prev => ({
                            ...prev,
                            preferred_complications: e.target.checked
                              ? [...prev.preferred_complications, complication]
                              : prev.preferred_complications.filter(c => c !== complication)
                          }));
                        }}
                        label={complication}
                      />
                    ))}
                  </OptionsGrid>
                </Section>

                <Section>
                  <SectionTitle>Dial Colors</SectionTitle>
                  <ColorGrid>
                    {colors.map(color => (
                      <ColorOption
                        key={color}
                        selected={preferences.dial_colors.includes(color)}
                        onClick={() => {
                          setPreferences(prev => ({
                            ...prev,
                            dial_colors: prev.dial_colors.includes(color)
                              ? prev.dial_colors.filter(c => c !== color)
                              : [...prev.dial_colors, color]
                          }));
                        }}
                      >
                        {color}
                      </ColorOption>
                    ))}
                  </ColorGrid>
                </Section>

                <ButtonGroup>
                  <SaveButton onClick={() => {
                    updateProfile();
                    setIsEditingPreferences(false);
                  }} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </SaveButton>
                  <CancelButton onClick={() => setIsEditingPreferences(false)}>
                    Cancel
                  </CancelButton>
                </ButtonGroup>
              </>
            ) : (
              <PreferencesDisplay>
                <PreferenceItem>
                  <Label>Price Range:</Label>
                  <Value>${preferences.price_range_min} - ${preferences.price_range_max}</Value>
                </PreferenceItem>
                
                <PreferenceItem>
                  <Label>Watch Styles:</Label>
                  <Value>{preferences.preferred_styles.length > 0 ? preferences.preferred_styles.join(', ') : 'None selected'}</Value>
                </PreferenceItem>
                
                <PreferenceItem>
                  <Label>Materials:</Label>
                  <Value>{preferences.preferred_materials.length > 0 ? preferences.preferred_materials.join(', ') : 'None selected'}</Value>
                </PreferenceItem>
                
                <PreferenceItem>
                  <Label>Complications:</Label>
                  <Value>{preferences.preferred_complications.length > 0 ? preferences.preferred_complications.join(', ') : 'None selected'}</Value>
                </PreferenceItem>
                
                <PreferenceItem>
                  <Label>Dial Colors:</Label>
                  <Value>{preferences.dial_colors.length > 0 ? preferences.dial_colors.join(', ') : 'None selected'}</Value>
                </PreferenceItem>
              </PreferencesDisplay>
            )}
          </PreferencesForm>
        )}

        {activeTab === 'favorites' && (
          <FavoritesSection>
            <SectionTitle>My Favorites</SectionTitle>
            {favorites.length === 0 ? (
              <EmptyState>
                <EmptyIcon>❤️</EmptyIcon>
                <EmptyText>You haven't favorited any watches yet</EmptyText>
                <BrowseButton onClick={() => navigate('/brands')}>Browse Watches</BrowseButton>
              </EmptyState>
            ) : (
              <WatchGrid>
                {favorites.map((watch) => (
                  <WatchCard key={watch.id} onClick={() => navigate(`/watch/${watch.id}`)}>
                    <WatchImage src={watch.image_url || "/placeholder.jpg"} alt={watch.model_name} />
                    <WatchInfo>
                      <ModelName>{watch.model_name}</ModelName>
                      <FamilyName>{watch.family_name}</FamilyName>
                      <Details>
                        <Year>{watch.year_produced}</Year>
                        {watch.price_eur && <Price>€{watch.price_eur.toLocaleString()}</Price>}
                      </Details>
                    </WatchInfo>
                    <RemoveButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(watch.id);
                      }}
                    >
                      ×
                    </RemoveButton>
                  </WatchCard>
                ))}
              </WatchGrid>
            )}
          </FavoritesSection>
        )}

        {activeTab === 'lists' && (
          <ListsSection>
            <SectionTitle>My Lists</SectionTitle>
            {lists.length === 0 ? (
              <EmptyState>
                <EmptyIcon>📋</EmptyIcon>
                <EmptyText>You haven't created any lists yet</EmptyText>
                <BrowseButton onClick={() => navigate('/brands')}>Browse Watches</BrowseButton>
              </EmptyState>
            ) : (
              <ListsContainer>
                {lists.map((list: WatchList) => (
                  <ListCard key={list.id}>
                    <ListHeader>
                      <ListName>{list.name}</ListName>
                      <ListActions>
                        <ListActionButton onClick={() => handleDeleteList(list.id)}>
                          🗑️
                        </ListActionButton>
                      </ListActions>
                    </ListHeader>
                    {list.items && list.items.length > 0 ? (
                      <ListWatches>
                        {list.items.map((watch: Watch) => (
                          <ListWatchItem key={watch.id} onClick={() => navigate(`/watch/${watch.id}`)}>
                            <ListWatchImage src={watch.image_url || "/placeholder.jpg"} alt={watch.model_name} />
                            <ListWatchInfo>
                              <ListWatchName>{watch.model_name}</ListWatchName>
                              <ListWatchDetails>
                                {watch.price_eur && <ListWatchPrice>€{watch.price_eur.toLocaleString()}</ListWatchPrice>}
                              </ListWatchDetails>
                            </ListWatchInfo>
                            <RemoveButton 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromList(list.id, watch.id);
                              }}
                            >
                              ×
                            </RemoveButton>
                          </ListWatchItem>
                        ))}
                      </ListWatches>
                    ) : (
                      <EmptyListState>
                        <EmptyListText>No watches in this list</EmptyListText>
                      </EmptyListState>
                    )}
                  </ListCard>
                ))}
              </ListsContainer>
            )}
          </ListsSection>
        )}
      </Content>
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #1a1a2e 0%,rgb(25, 33, 54) 25%, #0f0f23 50%, #0a0a0a 100%);
  font-family: 'Montserrat', sans-serif;
`;

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const ProfileHeader = styled.div`
  position: relative;
  margin-bottom: 3rem;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const Banner = styled.div`
  height: 240px;
  background: linear-gradient(135deg, #667eea 0%, #ffffff 100%);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
  }
`;

const ProfileInfo = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2.5rem;
  padding: 0 3rem 2rem;
  margin-top: -60px;
  position: relative;
`;

const ProfilePicture = styled.div`
  position: relative;
  width: 180px;
  height: 180px;
`;

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 6px solid white;
  object-fit: cover;
  background-color: #f0f0f0;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const EditProfilePictureButton = styled.button`
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #ffffff 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.4rem;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 25px rgba(0,0,0,0.3);
  }
`;

const EditIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProfileDetails = styled.div`
  margin-bottom: 1.5rem;
  flex: 1;
`;

const Name = styled.h2`
  margin: 0;
  font-size: 2.5rem;
  font-weight: 300;
  color: #2d3748;
  font-family: 'Montserrat', sans-serif;
  letter-spacing: -0.02em;
`;

const Bio = styled.p`
  margin: 0.8rem 0 0;
  color: #718096;
  font-size: 1.1rem;
  font-weight: 300;
  font-family: 'Montserrat', sans-serif;
  line-height: 1.6;
  max-width: 500px;
`;

const LogoutButton = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(238, 90, 36, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 25px rgba(238, 90, 36, 0.4);
  }
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 3rem;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 1.25rem 1.5rem;
  background: ${props => props.active ? 'linear-gradient(135deg, #667eea 0%, #ffffff 100%)' : 'transparent'};
  color: ${props => props.active ? 'white' : '#4a5568'};
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    background: ${props => props.active ? 'linear-gradient(135deg, #667eea 0%, #ffffff 100%)' : 'rgba(102, 126, 234, 0.1)'};
    color: ${props => props.active ? 'white' : '#667eea'};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: ${props => props.active ? '60%' : '0%'};
    height: 3px;
    background: ${props => props.active ? 'white' : 'transparent'};
    transition: width 0.3s ease;
  }
`;

const PreferencesForm = styled.div`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
`;

const SectionTitle = styled.h2`
  color: #2d3748;
  font-size: 1.8rem;
  margin: 0 0 1.5rem 0;
  font-weight: 400;
  font-family: 'Montserrat', sans-serif;
  letter-spacing: -0.01em;
`;

const PriceRangeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: rgba(102, 126, 234, 0.05);
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.1);
`;

const PriceInput = styled.input`
  padding: 1rem 1.5rem;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  width: 180px;
  font-family: 'Montserrat', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  background: white;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #a0aec0;
    font-weight: 400;
  }
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  background: rgba(102, 126, 234, 0.02);
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.05);
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  background: rgba(102, 126, 234, 0.02);
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.05);
`;

const ColorOption = styled.div<{ selected: boolean }>`
  padding: 1rem 0.75rem;
  text-align: center;
  border: 2px solid ${props => props.selected ? '#667eea' : 'rgba(102, 126, 234, 0.2)'};
  border-radius: 12px;
  cursor: pointer;
  background: ${props => props.selected ? 'linear-gradient(135deg, #667eea 0%, #ffffff 100%)' : 'white'};
  color: ${props => props.selected ? 'white' : '#4a5568'};
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  box-shadow: ${props => props.selected ? '0 8px 20px rgba(102, 126, 234, 0.3)' : '0 2px 8px rgba(0,0,0,0.05)'};

  &:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
  }
`;

const SaveButton = styled.button`
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #ffffff 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 25px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    background: #cbd5e0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  font-size: 1.4rem;
  color: #a0aec0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  color: #e53e3e;
  background: rgba(229, 62, 62, 0.1);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  border: 1px solid rgba(229, 62, 62, 0.2);
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
`;

interface CheckboxProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}

const Checkbox = ({ checked, onChange, label }: CheckboxProps) => (
  <CheckboxContainer>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      id={label}
    />
    <label htmlFor={label}>{label}</label>
  </CheckboxContainer>
);

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(102, 126, 234, 0.3);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #667eea;
  }

  label {
    cursor: pointer;
    font-family: 'Montserrat', sans-serif;
    font-weight: 500;
    color: #4a5568;
    font-size: 0.95rem;
  }
`;

const EditButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #ffffff 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  align-self: flex-start;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  justify-content: center;
`;

const CancelButton = styled.button`
  padding: 1rem 2rem;
  background: #718096;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:hover {
    background: #4a5568;
    transform: translateY(-2px);
  }
`;

const Section = styled.div`
  margin-bottom: 3rem;
  padding: 2rem;
  background: rgba(102, 126, 234, 0.02);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.05);
`;

const PreferencesDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  background: rgba(102, 126, 234, 0.02);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.1);
`;

const PreferenceItem = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  background: white;
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(102, 126, 234, 0.05);
    transform: translateX(8px);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  font-weight: 500;
  color: #4a5568;
  min-width: 140px;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.95rem;
`;

const Value = styled.span`
  color: #2d3748;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
`;

const Modal = styled.div`
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  background: rgba(102, 126, 234, 0.02);
  border-radius: 20px 20px 0 0;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #2d3748;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 1.4rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: #718096;
  padding: 0;
  line-height: 1;
  transition: color 0.3s ease;
  font-family: 'Montserrat', sans-serif;

  &:hover {
    color: #4a5568;
  }
`;

const ModalContent = styled.div`
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const UploadArea = styled.div`
  width: 100%;
  height: 240px;
  border: 3px dashed rgba(102, 126, 234, 0.3);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(102, 126, 234, 0.02);

  &:hover {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
    transform: scale(1.02);
  }
`;

const UploadIcon = styled.span`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const UploadText = styled.p`
  margin: 0;
  font-size: 1.3rem;
  color: #2d3748;
  font-family: 'Montserrat', sans-serif;
  font-weight: 400;
`;

const UploadSubtext = styled.p`
  margin: 0;
  font-size: 1rem;
  color: #718096;
  font-family: 'Montserrat', sans-serif;
  font-weight: 400;
`;

const HiddenInput = styled.input`
  display: none;
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 350px;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
`;

const FavoritesSection = styled.div`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 2rem;
`;

const WatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
`;

const WatchCard = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  transition: all 0.3s ease-in-out;
  cursor: pointer;
  position: relative;
  border: 1px solid rgba(102, 126, 234, 0.1);

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    border-color: rgba(102, 126, 234, 0.3);
  }
`;

const WatchImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const WatchInfo = styled.div`
  padding: 1.5rem;
`;

const ModelName = styled.h3`
  margin: 0;
  color: #2d3748;
  font-size: 1.2rem;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  letter-spacing: -0.01em;
`;

const FamilyName = styled.p`
  color: #718096;
  margin: 0.5rem 0;
  font-size: 0.95rem;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
`;

const Details = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  align-items: center;
`;

const Year = styled.span`
  color: #718096;
  font-size: 0.9rem;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
`;

const Price = styled.span`
  color: #38a169;
  font-weight: 700;
  font-size: 1rem;
  font-family: 'Montserrat', sans-serif;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  cursor: pointer;
  color: #e53e3e;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);

  &:hover {
    background: #e53e3e;
    color: white;
    transform: scale(1.1);
  }
`;

const ListsSection = styled.div`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ListsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const ListCard = styled.div`
  background: rgba(102, 126, 234, 0.02);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  border: 1px solid rgba(102, 126, 234, 0.1);
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(102, 126, 234, 0.05);
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
`;

const ListName = styled.h3`
  margin: 0;
  color: #2d3748;
  font-size: 1.3rem;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
`;

const ListActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const ListActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.3rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(229, 62, 62, 0.1);
    transform: scale(1.1);
  }
`;

const ListWatches = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
`;

const ListWatchItem = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 15px rgba(0,0,0,0.1);
  transition: all 0.3s ease-in-out;
  cursor: pointer;
  position: relative;
  border: 1px solid rgba(102, 126, 234, 0.1);

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0,0,0,0.15);
    border-color: rgba(102, 126, 234, 0.3);
  }
`;

const ListWatchImage = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
`;

const ListWatchInfo = styled.div`
  padding: 1rem;
`;

const ListWatchName = styled.h4`
  margin: 0;
  color: #2d3748;
  font-size: 1rem;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListWatchDetails = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  align-items: center;
`;

const ListWatchPrice = styled.span`
  color: #38a169;
  font-weight: 700;
  font-size: 0.9rem;
  font-family: 'Montserrat', sans-serif;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 3rem;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
`;

const EmptyText = styled.p`
  color: #718096;
  font-size: 1.2rem;
  margin-bottom: 2rem;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  line-height: 1.6;
`;

const BrowseButton = styled.button`
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #ffffff 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 25px rgba(102, 126, 234, 0.4);
  }
`;

const EmptyListState = styled.div`
  padding: 3rem;
  text-align: center;
`;

const EmptyListText = styled.p`
  color: #718096;
  font-size: 1.1rem;
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
`; 