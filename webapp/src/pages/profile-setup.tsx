import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/navbar';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-height: 100px;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

const ImageUpload = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ImagePreview = styled.img`
  max-width: 200px;
  max-height: 200px;
  object-fit: cover;
  border-radius: 50%;
`;

export default function ProfileSetup() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    profileImage: null as File | null,
    preferred_brands: [] as string[],
    price_range_min: 0,
    price_range_max: 100000,
    preferred_styles: [] as string[],
    preferred_features: [] as string[],
    preferred_materials: [] as string[],
    preferred_complications: [] as string[],
    dial_colors: [] as string[],
    case_sizes: [] as string[],
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('watch_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        navigate('/profile');
        return;
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, profileImage: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      let imageUrl = null;
      if (formData.profileImage) {
        const fileExt = formData.profileImage.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, formData.profileImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error: insertError } = await supabase
        .from('watch_preferences')
        .insert([{
          user_id: user.id,
          name: formData.name,
          bio: formData.bio,
          profile_image: imageUrl,
          preferred_brands: formData.preferred_brands,
          price_range_min: formData.price_range_min,
          price_range_max: formData.price_range_max,
          preferred_styles: formData.preferred_styles,
          preferred_features: formData.preferred_features,
          preferred_materials: formData.preferred_materials,
          preferred_complications: formData.preferred_complications,
          dial_colors: formData.dial_colors,
          case_sizes: formData.case_sizes,
        }]);

      if (insertError) throw insertError;

      navigate('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <Navbar />
      <Container>
        <h1>Set Up Your Profile</h1>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <Form onSubmit={handleSubmit}>
          <div>
            <label>Name</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label>Bio</label>
            <TextArea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>

          <ImageUpload>
            <label>Profile Picture</label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {formData.profileImage && (
              <ImagePreview
                src={URL.createObjectURL(formData.profileImage)}
                alt="Profile preview"
              />
            )}
          </ImageUpload>

          <Button type="submit">Save Profile</Button>
        </Form>
      </Container>
    </>
  );
} 