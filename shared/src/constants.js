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

/** Every city the platform knows about. Which ones are live is an admin setting (`activeCities`). */
export const ALL_CITIES = [
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266 },
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.391 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
];

/** Launch city. Clients use the server's /config list; this is only the fallback before it loads. */
export const DEFAULT_ACTIVE_CITIES = ['Chennai'];
export const CITIES = ALL_CITIES.filter((c) => DEFAULT_ACTIVE_CITIES.includes(c.name));

/** Localities with approximate centre points and pincodes (used for area pickers and map pins). */
export const LOCALITIES = {
  Chennai: [
    { name: 'Adyar', lat: 13.0012, lng: 80.2565, pincode: '600020' },
    { name: 'Ambattur', lat: 13.1143, lng: 80.1548, pincode: '600053' },
    { name: 'Anna Nagar', lat: 13.085, lng: 80.2101, pincode: '600040' },
    { name: 'Chromepet', lat: 12.9516, lng: 80.1462, pincode: '600044' },
    { name: 'ECR Neelankarai', lat: 12.9496, lng: 80.2593, pincode: '600115' },
    { name: 'Guindy', lat: 13.0067, lng: 80.2206, pincode: '600032' },
    { name: 'Kilpauk', lat: 13.0827, lng: 80.242, pincode: '600010' },
    { name: 'Kodambakkam', lat: 13.0521, lng: 80.2255, pincode: '600024' },
    { name: 'Medavakkam', lat: 12.9171, lng: 80.1923, pincode: '600100' },
    { name: 'Mylapore', lat: 13.0368, lng: 80.2676, pincode: '600004' },
    { name: 'Nungambakkam', lat: 13.0569, lng: 80.2425, pincode: '600034' },
    { name: 'OMR Sholinganallur', lat: 12.901, lng: 80.2279, pincode: '600119' },
    { name: 'Pallikaranai', lat: 12.9349, lng: 80.2137, pincode: '600100' },
    { name: 'Perungudi', lat: 12.9654, lng: 80.2461, pincode: '600096' },
    { name: 'Porur', lat: 13.0382, lng: 80.1565, pincode: '600116' },
    { name: 'T. Nagar', lat: 13.0418, lng: 80.2341, pincode: '600017' },
    { name: 'Tambaram', lat: 12.9249, lng: 80.1, pincode: '600045' },
    { name: 'Thoraipakkam', lat: 12.9416, lng: 80.2362, pincode: '600097' },
    { name: 'Vadapalani', lat: 13.05, lng: 80.2121, pincode: '600026' },
    { name: 'Velachery', lat: 12.9815, lng: 80.218, pincode: '600042' },
  ],
};

export const RADIUS_OPTIONS_KM = [2, 5, 10, 20];

export const SORTS = {
  newest: 'newest',
  priceAsc: 'price_asc',
  priceDesc: 'price_desc',
};

export const PAGE_SIZE = 12;
