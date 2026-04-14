import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/navbar';
import styled from 'styled-components';
import type { WatchPreferences } from '../types/supabase';
import { getImageUrl } from '../lib/imageUtils';

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
  const [collection, setCollection] = useState<Array<{ id: string; watch_id: string; purchase_price: number | null; purchase_date: string | null; notes: string | null; watch: Watch }>>([]);
  const [activeTab, setActiveTab] = useState<'preferences' | 'favorites' | 'lists' | 'collection'>('preferences');

  const watchStyles = ['Dress', 'Sport', 'Dive', 'Pilot', 'Field', 'Racing', 'Smart'];
  const materials = ['Stainless Steel', 'Gold', 'Titanium', 'Ceramic', 'Carbon Fiber', 'Bronze'];
  const complications = ['Chronograph', 'GMT', 'Perpetual Calendar', 'Moon Phase', 'Tourbillon'];
  const colors = ['Black', 'White', 'Blue', 'Green', 'Silver', 'Gold', 'Brown'];

  useEffect(() => {
    fetchProfile();
    fetchFavorites();
    fetchLists();
    fetchCollection();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data, error } = await supabase
        .from('watch_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setPreferences(data);
      } else {
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
              return { ...list, items: watchesData || [] };
            }
            return { ...list, items: [] };
          })
        );
        setLists(listsWithWatches);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  }

  async function fetchCollection() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_collection')
        .select('id, watch_id, purchase_price, purchase_date, notes')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const watchIds = data.map(item => item.watch_id);
        const { data: watchesData, error: watchesError } = await supabase
          .from('watches')
          .select('*')
          .in('id', watchIds);

        if (watchesError) throw watchesError;

        const watchMap = new Map((watchesData || []).map(w => [w.id, w]));
        setCollection(data.map(item => ({
          ...item,
          watch: watchMap.get(item.watch_id),
        })).filter(item => item.watch));
      }
    } catch (error) {
      console.error('Error fetching collection:', error);
    }
  }

  const handleRemoveFromCollection = async (collectionId: string) => {
    try {
      const { error } = await supabase.from('user_collection').delete().eq('id', collectionId);
      if (error) throw error;
      setCollection(prev => prev.filter(item => item.id !== collectionId));
    } catch (error) {
      console.error('Error removing from collection:', error);
    }
  };

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
      reader.onloadend = () => { setPreviewUrl(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      if (selectedImage.size > 5 * 1024 * 1024) throw new Error('Image size must be less than 5MB');
      if (!selectedImage.type.startsWith('image/')) throw new Error('Please upload an image file');

      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, selectedImage, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        if (uploadError.message.includes('duplicate')) {
          const newFileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: retryError } = await supabase.storage
            .from('profile-pictures')
            .upload(newFileName, selectedImage, { cacheControl: '3600', upsert: true });
          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
      const { error: updateError } = await supabase
        .from('watch_preferences')
        .update({ profile_image: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

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
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('watch_id', watchId);
      if (error) throw error;
      setFavorites(prev => prev.filter(watch => watch.id !== watchId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const removeFromList = async (listId: string, watchId: string) => {
    try {
      const { error } = await supabase.from('watch_list_items').delete().eq('list_id', listId).eq('watch_id', watchId);
      if (error) throw error;
      setLists(prevLists =>
        prevLists.map(list => list.id === listId
          ? { ...list, items: list.items.filter(watch => watch.id !== watchId) }
          : list
        )
      );
    } catch (error) {
      console.error('Error removing watch from list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      const { error } = await supabase.from('watch_lists').delete().eq('id', listId);
      if (error) throw error;
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
        {/* ── Profile Header ── */}
        <ProfileHeader>
          <ProfileTopRow>
            <ProfileLeft>
              <ProfilePicture>
                <ProfileImage
                  src={preferences.profile_image || '/profile-placeholder.png'}
                  alt={preferences.name || 'Profile'}
                />
                <EditPicBtn onClick={() => setIsEditingProfile(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </EditPicBtn>
              </ProfilePicture>
              <ProfileText>
                <Name>{preferences.name || 'Add your name'}</Name>
                <Bio>{preferences.bio || 'No bio added yet'}</Bio>
              </ProfileText>
            </ProfileLeft>
            <LogoutButton onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </LogoutButton>
          </ProfileTopRow>
          <StatsRow>
            <StatCard>
              <StatNum>{favorites.length}</StatNum>
              <StatLbl>Favorites</StatLbl>
            </StatCard>
            <StatCard>
              <StatNum>{lists.length}</StatNum>
              <StatLbl>Lists</StatLbl>
            </StatCard>
            <StatCard>
              <StatNum>{lists.reduce((acc, list) => acc + (list.items?.length || 0), 0)}</StatNum>
              <StatLbl>Saved</StatLbl>
            </StatCard>
            <StatCard>
              <StatNum>{preferences.preferred_styles.length}</StatNum>
              <StatLbl>Styles</StatLbl>
            </StatCard>
          </StatsRow>
        </ProfileHeader>

        {/* ── Upload Modal ── */}
        {isEditingProfile && (
          <ModalOverlay onClick={() => setIsEditingProfile(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHead>
                <ModalTitle>Change Profile Picture</ModalTitle>
                <CloseBtn onClick={() => setIsEditingProfile(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </CloseBtn>
              </ModalHead>
              <ModalBody>
                {previewUrl ? (
                  <ImgPreview src={previewUrl} alt="Preview" />
                ) : (
                  <UploadZone onClick={() => fileInputRef.current?.click()}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <UploadLabel>Click to choose a photo</UploadLabel>
                    <UploadHint>JPG, PNG up to 5MB</UploadHint>
                  </UploadZone>
                )}
                <HiddenInput type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" />
                {previewUrl && (
                  <BtnRow>
                    <PrimaryBtn onClick={handleImageUpload} disabled={loading}>
                      {loading ? 'Uploading...' : 'Upload'}
                    </PrimaryBtn>
                    <SecondaryBtn onClick={() => { setSelectedImage(null); setPreviewUrl(null); }}>
                      Cancel
                    </SecondaryBtn>
                  </BtnRow>
                )}
              </ModalBody>
            </Modal>
          </ModalOverlay>
        )}

        {error && <ErrorMsg>{error}</ErrorMsg>}

        {/* ── Tabs ── */}
        <TabBar>
          <TabBtn active={activeTab === 'preferences'} onClick={() => setActiveTab('preferences')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Preferences
          </TabBtn>
          <TabBtn active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={activeTab === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Favorites ({favorites.length})
          </TabBtn>
          <TabBtn active={activeTab === 'lists'} onClick={() => setActiveTab('lists')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Lists ({lists.length})
          </TabBtn>
          <TabBtn active={activeTab === 'collection'} onClick={() => setActiveTab('collection')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Collection ({collection.length})
          </TabBtn>
        </TabBar>

        {/* ── Preferences Tab ── */}
        {activeTab === 'preferences' && (
          <GlassCard>
            <CardHeader>
              <CardTitle>Watch Preferences</CardTitle>
              {!isEditingPreferences && (
                <EditBtn onClick={() => setIsEditingPreferences(true)}>Edit</EditBtn>
              )}
            </CardHeader>

            {isEditingPreferences ? (
              <>
                <FormSection>
                  <FormLabel>Price Range (USD)</FormLabel>
                  <PriceRow>
                    <PriceField
                      type="number"
                      value={preferences.price_range_min}
                      onChange={(e) => setPreferences(prev => ({ ...prev, price_range_min: parseInt(e.target.value) }))}
                      placeholder="Min"
                    />
                    <PriceDivider>to</PriceDivider>
                    <PriceField
                      type="number"
                      value={preferences.price_range_max}
                      onChange={(e) => setPreferences(prev => ({ ...prev, price_range_max: parseInt(e.target.value) }))}
                      placeholder="Max"
                    />
                  </PriceRow>
                </FormSection>

                <FormSection>
                  <FormLabel>Watch Styles</FormLabel>
                  <ChipGrid>
                    {watchStyles.map(style => (
                      <Chip
                        key={style}
                        selected={preferences.preferred_styles.includes(style)}
                        onClick={() => setPreferences(prev => ({
                          ...prev,
                          preferred_styles: prev.preferred_styles.includes(style)
                            ? prev.preferred_styles.filter(s => s !== style)
                            : [...prev.preferred_styles, style]
                        }))}
                      >{style}</Chip>
                    ))}
                  </ChipGrid>
                </FormSection>

                <FormSection>
                  <FormLabel>Materials</FormLabel>
                  <ChipGrid>
                    {materials.map(material => (
                      <Chip
                        key={material}
                        selected={preferences.preferred_materials.includes(material)}
                        onClick={() => setPreferences(prev => ({
                          ...prev,
                          preferred_materials: prev.preferred_materials.includes(material)
                            ? prev.preferred_materials.filter(m => m !== material)
                            : [...prev.preferred_materials, material]
                        }))}
                      >{material}</Chip>
                    ))}
                  </ChipGrid>
                </FormSection>

                <FormSection>
                  <FormLabel>Complications</FormLabel>
                  <ChipGrid>
                    {complications.map(comp => (
                      <Chip
                        key={comp}
                        selected={preferences.preferred_complications.includes(comp)}
                        onClick={() => setPreferences(prev => ({
                          ...prev,
                          preferred_complications: prev.preferred_complications.includes(comp)
                            ? prev.preferred_complications.filter(c => c !== comp)
                            : [...prev.preferred_complications, comp]
                        }))}
                      >{comp}</Chip>
                    ))}
                  </ChipGrid>
                </FormSection>

                <FormSection>
                  <FormLabel>Dial Colors</FormLabel>
                  <ChipGrid>
                    {colors.map(color => (
                      <Chip
                        key={color}
                        selected={preferences.dial_colors.includes(color)}
                        onClick={() => setPreferences(prev => ({
                          ...prev,
                          dial_colors: prev.dial_colors.includes(color)
                            ? prev.dial_colors.filter(c => c !== color)
                            : [...prev.dial_colors, color]
                        }))}
                      >{color}</Chip>
                    ))}
                  </ChipGrid>
                </FormSection>

                <BtnRow>
                  <PrimaryBtn onClick={() => { updateProfile(); setIsEditingPreferences(false); }} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </PrimaryBtn>
                  <SecondaryBtn onClick={() => setIsEditingPreferences(false)}>Cancel</SecondaryBtn>
                </BtnRow>
              </>
            ) : (
              <PrefsGrid>
                <PrefCard>
                  <PrefLabel>Price Range</PrefLabel>
                  <PrefValue>${preferences.price_range_min.toLocaleString()} &mdash; ${preferences.price_range_max.toLocaleString()}</PrefValue>
                </PrefCard>
                <PrefCard>
                  <PrefLabel>Styles</PrefLabel>
                  <TagList>
                    {preferences.preferred_styles.length > 0
                      ? preferences.preferred_styles.map(s => <Tag key={s}>{s}</Tag>)
                      : <PrefMuted>None selected</PrefMuted>}
                  </TagList>
                </PrefCard>
                <PrefCard>
                  <PrefLabel>Materials</PrefLabel>
                  <TagList>
                    {preferences.preferred_materials.length > 0
                      ? preferences.preferred_materials.map(m => <Tag key={m}>{m}</Tag>)
                      : <PrefMuted>None selected</PrefMuted>}
                  </TagList>
                </PrefCard>
                <PrefCard>
                  <PrefLabel>Complications</PrefLabel>
                  <TagList>
                    {preferences.preferred_complications.length > 0
                      ? preferences.preferred_complications.map(c => <Tag key={c}>{c}</Tag>)
                      : <PrefMuted>None selected</PrefMuted>}
                  </TagList>
                </PrefCard>
                <PrefCard>
                  <PrefLabel>Dial Colors</PrefLabel>
                  <TagList>
                    {preferences.dial_colors.length > 0
                      ? preferences.dial_colors.map(c => <Tag key={c}>{c}</Tag>)
                      : <PrefMuted>None selected</PrefMuted>}
                  </TagList>
                </PrefCard>
              </PrefsGrid>
            )}
          </GlassCard>
        )}

        {/* ── Favorites Tab ── */}
        {activeTab === 'favorites' && (
          <GlassCard>
            <CardTitle>My Favorites</CardTitle>
            {favorites.length === 0 ? (
              <EmptyBox>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <EmptyTitle>No favorites yet</EmptyTitle>
                <EmptyHint>Browse watches and tap the heart to save them here.</EmptyHint>
                <PrimaryBtn onClick={() => navigate('/brands')}>Browse Watches</PrimaryBtn>
              </EmptyBox>
            ) : (
              <WatchGrid>
                {favorites.map((watch) => (
                  <WatchCard key={watch.id} onClick={() => navigate(`/watch/${watch.id}`)}>
                    <WatchImgWrap>
                      <WatchImg src={getImageUrl(watch.image_url)} alt={watch.model_name} />
                      <ImgOverlay />
                      <RemoveBtn onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(watch.id); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </RemoveBtn>
                    </WatchImgWrap>
                    <WatchBody>
                      <WatchName>{watch.model_name}</WatchName>
                      <WatchFamily>{watch.family_name}</WatchFamily>
                      <WatchFooter>
                        <WatchYear>{watch.year_produced}</WatchYear>
                        {watch.price_eur && <WatchPrice>${watch.price_eur.toLocaleString()}</WatchPrice>}
                      </WatchFooter>
                    </WatchBody>
                  </WatchCard>
                ))}
              </WatchGrid>
            )}
          </GlassCard>
        )}

        {/* ── Lists Tab ── */}
        {activeTab === 'lists' && (
          <GlassCard>
            <CardTitle>My Lists</CardTitle>
            {lists.length === 0 ? (
              <EmptyBox>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <EmptyTitle>No lists yet</EmptyTitle>
                <EmptyHint>Create a list from any watch detail page.</EmptyHint>
                <PrimaryBtn onClick={() => navigate('/brands')}>Browse Watches</PrimaryBtn>
              </EmptyBox>
            ) : (
              <ListStack>
                {lists.map((list: WatchList) => (
                  <ListBlock key={list.id}>
                    <ListHead>
                      <ListTitle>{list.name}<ListCount>{list.items?.length || 0} watches</ListCount></ListTitle>
                      <DeleteBtn onClick={() => handleDeleteList(list.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </DeleteBtn>
                    </ListHead>
                    {list.items && list.items.length > 0 ? (
                      <ListItems>
                        {list.items.map((watch: Watch) => (
                          <ListItem key={watch.id} onClick={() => navigate(`/watch/${watch.id}`)}>
                            <ListItemImg src={getImageUrl(watch.image_url)} alt={watch.model_name} />
                            <ListItemText>
                              <ListItemName>{watch.model_name}</ListItemName>
                              {watch.price_eur && <ListItemPrice>${watch.price_eur.toLocaleString()}</ListItemPrice>}
                            </ListItemText>
                            <RemoveBtn onClick={(e) => { e.stopPropagation(); removeFromList(list.id, watch.id); }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </RemoveBtn>
                          </ListItem>
                        ))}
                      </ListItems>
                    ) : (
                      <ListEmpty>No watches in this list yet</ListEmpty>
                    )}
                  </ListBlock>
                ))}
              </ListStack>
            )}
          </GlassCard>
        )}
        {/* ── Collection Tab ── */}
        {activeTab === 'collection' && (
          <GlassCard>
            <CardTitle>My Collection</CardTitle>
            {collection.length > 0 && (
              <CollectionStats>
                <StatCard>
                  <StatNum>{collection.length}</StatNum>
                  <StatLbl>Watches</StatLbl>
                </StatCard>
                <StatCard>
                  <StatNum>${collection.reduce((sum, item) => sum + (item.watch?.price_eur || 0), 0).toLocaleString()}</StatNum>
                  <StatLbl>Market Value</StatLbl>
                </StatCard>
                <StatCard>
                  <StatNum>${collection.reduce((sum, item) => sum + (item.purchase_price || 0), 0).toLocaleString()}</StatNum>
                  <StatLbl>Total Paid</StatLbl>
                </StatCard>
              </CollectionStats>
            )}
            {collection.length === 0 ? (
              <EmptyBox>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <EmptyTitle>No watches in your collection</EmptyTitle>
                <EmptyHint>Add watches you own from any watch detail page.</EmptyHint>
                <PrimaryBtn onClick={() => navigate('/brands')}>Browse Watches</PrimaryBtn>
              </EmptyBox>
            ) : (
              <WatchGrid>
                {collection.map((item) => (
                  <WatchCard key={item.id} onClick={() => navigate(`/watch/${item.watch.id}`)}>
                    <WatchImgWrap>
                      <WatchImg src={getImageUrl(item.watch.image_url)} alt={item.watch.model_name} />
                      <ImgOverlay />
                      <RemoveBtn onClick={(e) => { e.stopPropagation(); handleRemoveFromCollection(item.id); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </RemoveBtn>
                    </WatchImgWrap>
                    <WatchBody>
                      <WatchName>{item.watch.model_name}</WatchName>
                      <WatchFamily>{item.watch.family_name}</WatchFamily>
                      <CollectionMeta>
                        {item.purchase_price && (
                          <CollectionPaid>Paid: ${item.purchase_price.toLocaleString()}</CollectionPaid>
                        )}
                        {item.watch.price_eur && (
                          <WatchPrice>Market: ${item.watch.price_eur.toLocaleString()}</WatchPrice>
                        )}
                        {item.purchase_price && item.watch.price_eur && (
                          <CollectionGain gained={item.watch.price_eur >= item.purchase_price}>
                            {item.watch.price_eur >= item.purchase_price ? '+' : ''}
                            ${(item.watch.price_eur - item.purchase_price).toLocaleString()}
                          </CollectionGain>
                        )}
                      </CollectionMeta>
                      {item.purchase_date && (
                        <CollectionDate>Purchased: {new Date(item.purchase_date).toLocaleDateString()}</CollectionDate>
                      )}
                    </WatchBody>
                  </WatchCard>
                ))}
              </WatchGrid>
            )}
          </GlassCard>
        )}
      </Content>
    </Container>
  );
}

/* ════════════════════════════════════════
   STYLED COMPONENTS
   ════════════════════════════════════════ */

const Container = styled.div`
  min-height: 100vh;
  background: #0a0a0a;
  font-family: 'Inter', sans-serif;
`;

const Content = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 2rem 4rem;
`;

const Loading = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: rgba(255,255,255,0.5);
  font-family: 'Inter', sans-serif;
  background: #0a0a0a;
`;

const ErrorMsg = styled.div`
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
`;

/* ── Profile Header ── */

const ProfileHeader = styled.div`
  border-bottom: 1px solid #141414;
  padding: 2rem 0;
  margin-bottom: 1.5rem;
`;

const ProfileTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const ProfileLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const ProfilePicture = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const ProfileImage = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
`;

const EditPicBtn = styled.button`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255,255,255,0.2);
    color: #fff;
  }
`;

const ProfileText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Name = styled.h1`
  margin: 0;
  font-family: 'Georgia', serif;
  font-size: 1.5rem;
  font-weight: 400;
  color: #f5f5f0;
  line-height: 1.2;
`;

const Bio = styled.p`
  margin: 0;
  color: rgba(255,255,255,0.5);
  font-size: 0.95rem;
  font-weight: 400;
  max-width: 400px;
  line-height: 1.5;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #fecaca;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
`;

const StatCard = styled.div`
  text-align: center;
  padding: 1rem;
  border-right: 1px solid #141414;
  &:last-child { border-right: none; }
`;

const StatNum = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
`;

const StatLbl = styled.div`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 0.25rem;
`;

/* ── Tabs ── */

const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid #141414;
  margin-bottom: 2rem;
`;

const TabBtn = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1.25rem;
  background: none;
  color: ${p => p.active ? '#e8e8e3' : '#4a4a4a'};
  border: none;
  border-bottom: 2px solid ${p => p.active ? '#e8e8e3' : 'transparent'};
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.15s;
  margin-bottom: -1px;

  &:hover { color: ${p => p.active ? '#e8e8e3' : '#888'}; }

  svg { opacity: ${p => p.active ? 1 : 0.4}; }
`;

/* ── Glass Card (shared container for tab content) ── */

const GlassCard = styled.div`
  padding: 0;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const CardTitle = styled.h2`
  margin: 0 0 1.5rem;
  font-family: 'Georgia', serif;
  font-size: 1.2rem;
  font-weight: 400;
  color: #f5f5f0;
`;

const EditBtn = styled.button`
  padding: 0.5rem 1.2rem;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }
`;

/* ── Preferences Display ── */

const PrefsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
`;

const PrefCard = styled.div`
  padding: 1.25rem 1.5rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
`;

const PrefLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.6rem;
`;

const PrefValue = styled.div`
  color: #ffffff;
  font-weight: 600;
  font-size: 1.05rem;
`;

const PrefMuted = styled.span`
  color: rgba(255,255,255,0.25);
  font-size: 0.9rem;
  font-style: italic;
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const Tag = styled.span`
  display: inline-block;
  padding: 0.3rem 0.75rem;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
`;

/* ── Preferences Edit Form ── */

const FormSection = styled.div`
  margin-bottom: 2rem;
`;

const FormLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0.75rem;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PriceField = styled.input`
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: #ffffff;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  width: 160px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(255,255,255,0.08);
  }

  &::placeholder { color: rgba(255,255,255,0.25); }
`;

const PriceDivider = styled.span`
  color: rgba(255,255,255,0.3);
  font-size: 0.9rem;
`;

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Chip = styled.button<{ selected: boolean }>`
  padding: 0.55rem 1.1rem;
  background: ${p => p.selected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.selected ? '#a5b4fc' : 'rgba(255,255,255,0.5)'};
  border: 1px solid ${p => p.selected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.08)'};
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.15s ease;

  &:hover {
    background: ${p => p.selected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.08)'};
    color: ${p => p.selected ? '#c4b5fd' : 'rgba(255,255,255,0.7)'};
  }
`;

/* ── Buttons ── */

const BtnRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
  justify-content: center;
`;

const PrimaryBtn = styled.button`
  padding: 0.65rem 1.5rem;
  background: #f5f5f0;
  color: #0a0a0a;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.8rem;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.3; cursor: default; }
`;

const SecondaryBtn = styled.button`
  padding: 0.75rem 1.5rem;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.8);
  }
`;

/* ── Modal ── */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.5);
`;

const ModalHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 600;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  padding: 4px;
  display: flex;
  transition: color 0.2s;
  &:hover { color: #fff; }
`;

const ModalBody = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
`;

const UploadZone = styled.div`
  width: 100%;
  height: 200px;
  border: 2px dashed rgba(255,255,255,0.12);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255,255,255,0.02);

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(99, 102, 241, 0.05);
  }
`;

const UploadLabel = styled.p`
  margin: 0;
  color: rgba(255,255,255,0.6);
  font-size: 0.95rem;
  font-weight: 500;
`;

const UploadHint = styled.p`
  margin: 0;
  color: rgba(255,255,255,0.25);
  font-size: 0.8rem;
`;

const HiddenInput = styled.input`display: none;`;

const ImgPreview = styled.img`
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
  border-radius: 12px;
`;

/* ── Watch Grid (Favorites) ── */

const WatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
`;

const WatchCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.15);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  }
`;

const WatchImgWrap = styled.div`
  position: relative;
  overflow: hidden;
`;

const WatchImg = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
`;

const ImgOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);
  pointer-events: none;
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255,255,255,0.7);
  transition: all 0.15s ease;
  opacity: 0;

  ${WatchCard}:hover &,
  ${() => ListItem}:hover & {
    opacity: 1;
  }

  &:hover {
    background: rgba(239, 68, 68, 0.8);
    color: #fff;
  }
`;

const WatchBody = styled.div`
  padding: 1.1rem 1.25rem;
`;

const WatchName = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const WatchFamily = styled.p`
  margin: 0.3rem 0 0;
  color: rgba(255,255,255,0.4);
  font-size: 0.8rem;
  font-weight: 500;
`;

const WatchFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.06);
`;

const WatchYear = styled.span`
  color: rgba(255,255,255,0.3);
  font-size: 0.8rem;
  font-weight: 500;
`;

const WatchPrice = styled.span`
  color: #4ade80;
  font-weight: 700;
  font-size: 0.9rem;
`;

/* ── Lists ── */

const ListStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ListBlock = styled.div`
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  overflow: hidden;
`;

const ListHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
`;

const ListTitle = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ListCount = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.05);
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.25);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 6px;
  display: flex;
  transition: all 0.15s;

  &:hover {
    color: #f87171;
    background: rgba(239, 68, 68, 0.1);
  }
`;

const ListItems = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  padding: 1.25rem;
`;

const ListItem = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.12);
    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
  }
`;

const ListItemImg = styled.img`
  width: 100%;
  height: 130px;
  object-fit: cover;
  display: block;
`;

const ListItemText = styled.div`
  padding: 0.75rem 1rem;
`;

const ListItemName = styled.h4`
  margin: 0;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListItemPrice = styled.span`
  color: #4ade80;
  font-weight: 600;
  font-size: 0.8rem;
  display: block;
  margin-top: 0.25rem;
`;

const ListEmpty = styled.div`
  padding: 2.5rem;
  text-align: center;
  color: rgba(255,255,255,0.2);
  font-size: 0.9rem;
`;

/* ── Empty States ── */

const EmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 2rem;
  text-align: center;
  gap: 0.75rem;
`;

const EmptyTitle = styled.p`
  margin: 0;
  color: rgba(255,255,255,0.5);
  font-size: 1.1rem;
  font-weight: 600;
`;

const EmptyHint = styled.p`
  margin: 0 0 0.75rem;
  color: rgba(255,255,255,0.25);
  font-size: 0.9rem;
  max-width: 300px;
  line-height: 1.5;
`;

/* ── Collection Tab ── */

const CollectionStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
`;

const CollectionMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255,255,255,0.06);
`;

const CollectionPaid = styled.span`
  color: rgba(255,255,255,0.4);
  font-size: 0.8rem;
  font-weight: 500;
`;

const CollectionGain = styled.span<{ gained: boolean }>`
  color: ${p => p.gained ? '#4ade80' : '#f87171'};
  font-size: 0.8rem;
  font-weight: 700;
`;

const CollectionDate = styled.span`
  color: rgba(255,255,255,0.25);
  font-size: 0.7rem;
  margin-top: 0.3rem;
`;
