export interface Place {
  id: string;
  name: string;
  category: string;
  subtitle?: string;
  location: string;
  address?: string;
  mapUrl?: string;
  images: string[];
  logo?: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  cost: number; // 1-4 for $, $$, $$$, $$$$
  distance: string;
  goodToKnow: string[];
  hours: string;
  weeklyHours?: Record<string, { closed: boolean; intervals: { open: string; close: string }[] }> | null;
  lat?: number;
  lng?: number;
  phone?: string;
  reviews?: Review[];
}

export interface Review {
  id: string;
  author: string;
  date?: string;
  createdAt?: string;
  rating: number;
  text: string;
  avatar?: string;
}

export interface Guide {
  id: string;
  title: string;
  publisher: string;
  publisherLogo?: string;
  image: string;
  description: string;
  updatedAt: string;
  placeCount: number;
  places: Place[];
}

export interface Category {
  id: string;
  name: string;
  visits: number;
  gradient: string;
  emoji: string;
}

export interface Colonia {
  id: string;
  name: string;
  visits: number;
  image: string;
  type?: string;
  cp?: string;
}

export interface Visit {
  id: string;
  name: string;
  location: string;
  iconBg: string;
  emoji: string;
  dateStr: string;
}

export type FeedItem = 
  | { type: 'guide'; data: Guide }
  | { type: 'place'; data: Place };
