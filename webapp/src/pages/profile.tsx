import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/navbar';
import styled from 'styled-components';
import type { WatchPreferences } from '../types/supabase';

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  if (loading) return <Loading>Loading...</Loading>;

  return (
    <Container>
      <Navbar />
      <Content>
        <Header>
          <Title>Profile</Title>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </Header>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ProfileSection>
          <SectionTitle>About Me</SectionTitle>
          <BioTextarea
            value={preferences.bio || ''}
            onChange={(e) => setPreferences(prev => ({
              ...prev,
              bio: e.target.value
            }))}
            placeholder="Tell us about yourself..."
            rows={4}
          />
          <SaveButton onClick={updateProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Save Bio'}
          </SaveButton>
        </ProfileSection>

        <PreferencesForm>
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

          <SaveButton onClick={updateProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </SaveButton>
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