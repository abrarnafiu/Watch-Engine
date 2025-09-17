import { API_URL } from '../config';

/**
 * Get a proxied image URL to avoid SSL certificate issues
 * @param imageUrl - The original image URL
 * @param fallback - Fallback image path if no URL provided
 * @returns Proxied image URL or fallback
 */
export const getImageUrl = (imageUrl: string | null | undefined, fallback: string = "/placeholder.jpg"): string => {
  if (!imageUrl) return fallback;
  
  // Use the proxy endpoint to avoid SSL certificate issues
  return `${API_URL}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
};

/**
 * Handle image loading errors by setting a fallback
 * @param event - The error event
 * @param setImageError - State setter for image error
 * @param fallbackSrc - Fallback image source
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  setImageError: (error: boolean) => void,
  fallbackSrc: string = "/placeholder.jpg"
) => {
  const img = event.target as HTMLImageElement;
  if (img.src !== fallbackSrc) {
    setImageError(true);
    img.src = fallbackSrc;
  }
};
