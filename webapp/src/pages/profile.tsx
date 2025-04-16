import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/navbar';
import styled from 'styled-components';
import type { WatchPreferences } from '../types/supabase';

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
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

  // Predefined options for selections
  const watchStyles = ['Dress', 'Sport', 'Dive', 'Pilot', 'Field', 'Racing', 'Smart'];
  const materials = ['Stainless Steel', 'Gold', 'Titanium', 'Ceramic', 'Carbon Fiber', 'Bronze'];
  const complications = ['Chronograph', 'GMT', 'Perpetual Calendar', 'Moon Phase', 'Tourbillon'];
  const colors = ['Black', 'White', 'Blue', 'Green', 'Silver', 'Gold', 'Brown'];

  useEffect(() => {
    fetchProfile();
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
      const { data: uploadData, error: uploadError } = await supabase.storage
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

        <ProfileSection>
          <SectionTitle>About Me</SectionTitle>
          {isEditingBio ? (
            <>
              <BioTextarea
                value={preferences.bio || ''}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  bio: e.target.value
                }))}
                placeholder="Tell us about yourself..."
                rows={4}
              />
              <ButtonGroup>
                <SaveButton onClick={() => {
                  updateProfile();
                  setIsEditingBio(false);
                }} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Bio'}
                </SaveButton>
                <CancelButton onClick={() => setIsEditingBio(false)}>
                  Cancel
                </CancelButton>
              </ButtonGroup>
            </>
          ) : (
            <BioDisplay>
              <BioText>{preferences.bio || 'No bio added yet'}</BioText>
              <EditButton onClick={() => setIsEditingBio(true)}>
                Edit Bio
              </EditButton>
            </BioDisplay>
          )}
        </ProfileSection>

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
      </Content>
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
`;

const LogoutButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #c82333;
  }
`;

const PreferencesForm = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  color: #333;
  font-size: 1.2rem;
  margin-bottom: 1rem;
`;

const PriceRangeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PriceInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 150px;
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
`;

const ColorOption = styled.div<{ selected: boolean }>`
  padding: 0.5rem;
  text-align: center;
  border: 2px solid ${props => props.selected ? '#007bff' : '#ddd'};
  border-radius: 4px;
  cursor: pointer;
  background-color: ${props => props.selected ? '#e6f3ff' : 'white'};

  &:hover {
    border-color: #007bff;
  }
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #666;
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  background-color: #f8d7da;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
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
  gap: 0.5rem;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
  }

  label {
    cursor: pointer;
  }
`;

const BioTextarea = styled.textarea`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const ProfileSection = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
`;

const BioDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

const BioText = styled.p`
  flex: 1;
  margin: 0;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 100px;
  white-space: pre-wrap;
`;

const EditButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  align-self: flex-start;

  &:hover {
    background-color: #0056b3;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const CancelButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #5a6268;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const PreferencesDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const PreferenceItem = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #e9ecef;
  
  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  font-weight: 600;
  color: #495057;
  min-width: 120px;
`;

const Value = styled.span`
  color: #212529;
`;

const ProfileHeader = styled.div`
  position: relative;
  margin-bottom: 2rem;
`;

const Banner = styled.div`
  height: 200px;
  background: linear-gradient(45deg, #1a1a1a, #333);
  border-radius: 10px 10px 0 0;
`;

const ProfileInfo = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2rem;
  padding: 0 2rem;
  margin-top: -50px;
`;

const ProfilePicture = styled.div`
  position: relative;
  width: 150px;
  height: 150px;
`;

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid white;
  object-fit: cover;
  background-color: #f0f0f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const EditProfilePictureButton = styled.button`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #007bff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0056b3;
  }
`;

const EditIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProfileDetails = styled.div`
  margin-bottom: 1rem;
`;

const Name = styled.h2`
  margin: 0;
  font-size: 2rem;
  color: #333;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: white;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;

  &:hover {
    color: #333;
  }
`;

const ModalContent = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const UploadArea = styled.div`
  width: 100%;
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: #007bff;
  }
`;

const UploadIcon = styled.span`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const UploadText = styled.p`
  margin: 0;
  font-size: 1.2rem;
  color: #333;
`;

const UploadSubtext = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #666;
`;

const HiddenInput = styled.input`
  display: none;
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
`; 