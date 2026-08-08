export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  productCount: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  localName?: string | null;
  pricePerKg: number;
  imageUrl?: string | null;
  alternateNames: string[];
  benefits?: string | null;
  storageTips?: string | null;
  nutrition?: Record<string, string> | null;
  origin?: string | null;
  shelfLife?: string | null;
  inStock: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isPremium: boolean;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  category?: Category;
  images?: { id: string; url: string; alt?: string | null }[];
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  pricePerKg: number;
  weightGrams: number;
  quantity: number;
  discountPercent?: number;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  benefitTag?: string | null;
  price: number;
  items: {
    weightGrams: number;
    linePrice: number;
    product: Product;
  }[];
};
