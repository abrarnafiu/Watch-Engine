import { useState } from 'react';

export default function WatchCard({ watch, onRemove }: { watch: any, onRemove?: (id: string) => void }) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="watch-card">
      <img 
        src={imageError ? '/placeholder.jpg' : watch.image_url} 
        alt={watch.model_name}
        onError={handleImageError}
      />
      {/* ... rest of your existing code ... */}
    </div>
  );
} 