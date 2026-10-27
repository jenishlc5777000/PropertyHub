export const APP_NAME = 'PropertyHub';
export const CURRENCY = 'INR';
export const GST_RATE = 0.18;

export const ROLES = ['buyer', 'agent', 'admin'];
export const PROPERTY_TYPES = ['apartment', 'villa', 'house', 'plot', 'commercial'];
export const PURPOSES = ['sale', 'rent'];
export const FURNISHING = ['unfurnished', 'semi-furnished', 'furnished'];
export const PROPERTY_STATUS = ['pending', 'approved', 'rejected', 'sold', 'rented'];
export const VISIT_STATUS = ['requested', 'confirmed', 'cancelled', 'done'];
export const ORDER_STATUS = ['created', 'paid', 'failed', 'refunded'];
export const MAX_IMAGES = 10;

export const AMENITIES = [
  'parking',
  'lift',
  'power-backup',
  'security',
  'gym',
  'swimming-pool',
  'club-house',
  'garden',
  'play-area',
  'cctv',
  'gated-community',
  'water-supply',
  'wifi',
  'ac',
  'modular-kitchen',
  'pet-friendly',
];

export const CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266 },
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.391 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
];

export const SORTS = {
  newest: 'newest',
  priceAsc: 'price_asc',
  priceDesc: 'price_desc',
};

export const PAGE_SIZE = 12;
