import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/navbar';

interface ProfileData {
  name: string;
  bio: string;
  preferred_brands: string[];
  price_range_min: number;
  price_range_max: number;
  preferred_styles: string[];
  preferred_features: string[];
  preferred_materials: string[];
  preferred_complications: string[];
  dial_colors: string[];
  case_sizes: string[];
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    bio: '',
    preferred_brands: [],
    price_range_min: 0,
    price_range_max: 100000,
    preferred_styles: [],
    preferred_features: [],
    preferred_materials: [],
    preferred_complications: [],
    dial_colors: [],
    case_sizes: [],
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if profile already exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('watch_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (existingProfile) {
        // If profile exists, redirect to profile page
        navigate('/profile');
        return;
      }

      // If no profile exists, get user's name from auth metadata
      if (user.user_metadata?.full_name) {
        setProfileData(prev => ({
          ...prev,
          name: user.user_metadata.full_name
        }));
      }

      setLoading(false);
    } catch (err) {
      console.error('Error checking user:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      const { error: upsertError } = await supabase
        .from('watch_preferences')
        .upsert({
          user_id: user.id,
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      navigate('/profile');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Navbar />
        <LoadingMessage>Loading...</LoadingMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Navbar />
      <Content>
        <Form onSubmit={handleSubmit}>
          <Title>Complete Your Profile</Title>
          <Subtitle>Tell us about your watch preferences to get personalized recommendations</Subtitle>

          <FormGroup>
            <Label>Name</Label>
            <Input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Bio</Label>
            <TextArea
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself and your watch collection..."
            />
          </FormGroup>

          <FormGroup>
            <Label>Price Range (EUR)</Label>
            <PriceRangeContainer>
              <Input
                type="number"
                value={profileData.price_range_min}
                onChange={(e) => setProfileData(prev => ({ ...prev, price_range_min: Number(e.target.value) }))}
                min="0"
                placeholder="Min"
              />
              <Input
                type="number"
                value={profileData.price_range_max}
                onChange={(e) => setProfileData(prev => ({ ...prev, price_range_max: Number(e.target.value) }))}
                min="0"
                placeholder="Max"
              />
            </PriceRangeContainer>
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Complete Profile'}
          </Button>
        </Form>
      </Content>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const Content = styled.div`
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const TextArea = styled.textarea`
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const PriceRangeContainer = styled.div`
  display: flex;
  gap: 1rem;
  
  ${Input} {
    flex: 1;
  }
`;

const Button = styled.button`
  padding: 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: #0056b3;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  background-color: #f8d7da;
  padding: 0.8rem;
  border-radius: 4px;
  text-align: center;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #666;
`; 