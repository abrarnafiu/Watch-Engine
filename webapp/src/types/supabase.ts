export interface WatchPreferences {
  user_id: string;
  preferred_brands: string[];
  price_range_min: number;
  price_range_max: number;
  preferred_styles: string[];
  preferred_features: string[];
  preferred_materials: string[];
  preferred_complications: string[];
  dial_colors: string[];
  case_sizes: number[];
  created_at?: string;
  updated_at?: string;
} 