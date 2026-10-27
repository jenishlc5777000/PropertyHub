import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { slugify } from '@propertyhub/shared';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Property, Plan, Setting, CreditWallet, PromoCode } from '../models/index.js';
import { logger } from '../utils/logger.js';

const img = (id) => ({ url: `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`, publicId: `seed:${id}` });
const EXTERIOR = ['1568605114967-8130f3a36994', '1570129477492-45c003edd2be', '1512917774080-9991f1c4c750', '1600596542815-ffad4c1539a9', '1600585154340-be6161a56a0c', '1580587771525-78b9dba3b914', '1613490493576-7fde63acd811', '1600607687939-ce8a6c25118c'];
const INTERIOR = ['1502672260266-1c1ef2d93688', '1522708323590-d24dbb6b0267', '1493809842364-78817add7ffb', '1484154218962-a197022b5858', '1560448204-e02f11c3d0e2', '1505691938895-1758d7feb511'];
const OFFICE = ['1486406146926-c627a92ad1ab', '1497366216548-37526070297c'];

const LOCALITIES = {
  Mumbai: { state: 'Maharashtra', pin: '400', spots: [['Andheri West', 19.1364, 72.8296], ['Powai', 19.1176, 72.906], ['Bandra West', 19.0596, 72.8295], ['Thane West', 19.2183, 72.9781], ['Malad West', 19.1874, 72.8484]] },
  Bengaluru: { state: 'Karnataka', pin: '560', spots: [['Whitefield', 12.9698, 77.75], ['Koramangala', 12.9352, 77.6245], ['HSR Layout', 12.9116, 77.6474], ['Indiranagar', 12.9784, 77.6408], ['Electronic City', 12.8399, 77.677]] },
  Delhi: { state: 'Delhi', pin: '110', spots: [['Dwarka', 28.5921, 77.046], ['Saket', 28.5245, 77.2066], ['Vasant Kunj', 28.5293, 77.1525]] },
  Gurugram: { state: 'Haryana', pin: '122', spots: [['DLF Phase 3', 28.4931, 77.0935], ['Sohna Road', 28.4089, 77.0418]] },
  Pune: { state: 'Maharashtra', pin: '411', spots: [['Hinjewadi', 18.5913, 73.7389], ['Baner', 18.559, 73.7868], ['Kharadi', 18.5515, 73.9348]] },
  Hyderabad: { state: 'Telangana', pin: '500', spots: [['Gachibowli', 17.44, 78.3489], ['Madhapur', 17.4483, 78.3915], ['Kondapur', 17.4622, 78.3568]] },
  Chennai: { state: 'Tamil Nadu', pin: '600', spots: [['OMR Sholinganallur', 12.901, 80.2279], ['Anna Nagar', 13.085, 80.2101], ['Velachery', 12.9815, 80.218]] },
};

// [type, purpose, beds, baths, area, price, furnishing, cityIndexHint]
const TEMPLATES = [
  ['apartment', 'sale', 2, 2, 1050, 8500000, 'semi-furnished'],
  ['apartment', 'sale', 3, 3, 1450, 14500000, 'furnished'],
  ['apartment', 'rent', 2, 2, 980, 32000, 'furnished'],
  ['apartment', 'rent', 1, 1, 600, 18000, 'semi-furnished'],
  ['villa', 'sale', 4, 4, 3200, 42000000, 'furnished'],
  ['villa', 'rent', 4, 5, 3500, 150000, 'furnished'],
  ['house', 'sale', 3, 2, 1800, 12000000, 'unfurnished'],
  ['house', 'rent', 3, 3, 1600, 45000, 'semi-furnished'],
  ['plot', 'sale', 0, 0, 2400, 9600000, 'unfurnished'],
  ['commercial', 'rent', 0, 2, 2200, 180000, 'furnished'],
  ['commercial', 'sale', 0, 2, 1500, 25000000, 'semi-furnished'],
];

const AMENITY_SETS = {
  apartment: ['parking', 'lift', 'power-backup', 'security', 'gym', 'swimming-pool', 'club-house', 'cctv', 'gated-community', 'water-supply'],
  villa: ['parking', 'power-backup', 'security', 'garden', 'swimming-pool', 'cctv', 'gated-community', 'modular-kitchen', 'pet-friendly'],
  house: ['parking', 'water-supply', 'garden', 'power-backup', 'pet-friendly'],
  plot: ['gated-community', 'water-supply', 'security'],
  commercial: ['parking', 'lift', 'power-backup', 'security', 'cctv', 'wifi', 'ac'],
};

const TITLES = {
  apartment: (b, loc) => `Spacious ${b} BHK Apartment in ${loc}`,
  villa: (b, loc) => `Luxury ${b} BHK Independent Villa at ${loc}`,
  house: (b, loc) => `Well-kept ${b} BHK Independent House, ${loc}`,
  plot: (_b, loc) => `Clear-title Residential Plot in ${loc}`,
  commercial: (_b, loc) => `Grade A Office Space near ${loc} Metro`,
};

function describe(t, purpose, loc, city) {
  const what = {
    apartment: 'a bright, well-ventilated apartment in a gated society with 24x7 security and power backup',
    villa: 'a premium independent villa with a private garden, modular kitchen and covered car parking',
    house: 'a sturdy independent house on a quiet street, close to schools, hospitals and markets',
    plot: 'a DTCP/RERA-approved residential plot with clear title, ready for immediate registration',
    commercial: 'a ready-to-move office space with workstations, conference room and pantry',
  }[t];
  return `Presenting ${what} in ${loc}, ${city}. Excellent connectivity to the IT corridor, railway station and airport. ${
    purpose === 'rent' ? 'Available for immediate move-in; 2-month security deposit.' : 'Bank-loan approved by leading banks.'
  } Contact the owner to schedule a site visit.`;
}

const pick = (arr, i) => arr[i % arr.length];
const jitter = (n, i) => n + (((i * 37) % 21) - 10) / 1000;

export async function seed({ reset = false } = {}) {
  if (reset) {
    await Promise.all([User.deleteMany({}), Property.deleteMany({}), Plan.deleteMany({}), Setting.deleteMany({}), CreditWallet.deleteMany({}), PromoCode.deleteMany({})]);
  }

  await Setting.findOneAndUpdate({ key: 'freeCredits' }, { value: env.defaultFreeCredits }, { upsert: true });
  if (!(await Plan.exists({}))) {
    await Plan.create({
      name: '100 Contact Credits',
      price: 999,
      credits: 100,
      validityDays: 365,
      active: true,
      benefits: ['Unlock 100 owner/agent contacts', 'Just ₹9.99 per contact', 'Valid for 12 months', 'Never pay twice for the same property'],
    });
  }
  if (!(await PromoCode.exists({ code: 'WELCOME10' }))) {
    await PromoCode.create({ code: 'WELCOME10', discountPct: 10, maxUses: 1000, expiresAt: new Date(Date.now() + 365 * 86400000) });
  }

  const mkUser = async (data, password) => {
    const existing = await User.findOne({ email: data.email });
    if (existing) return existing;
    const u = new User(data);
    await u.setPassword(password);
    await u.save();
    await CreditWallet.updateOne(
      { user: u._id },
      { $setOnInsert: { user: u._id, freeCredits: env.defaultFreeCredits, paidCredits: [] } },
      { upsert: true }
    );
    return u;
  };

  await mkUser({ name: 'PropertyHub Admin', email: env.seed.adminEmail, phone: '9000000001', role: 'admin' }, env.seed.adminPassword);
  const agents = [
    await mkUser({ name: 'Priya Sharma', email: 'priya@propertyhub.in', phone: '9876543210', whatsapp: '9876543210', role: 'agent', bio: 'RERA-registered agent covering Mumbai and Pune for 9 years.' }, 'Agent@12345'),
    await mkUser({ name: 'Arjun Reddy', email: 'arjun@propertyhub.in', phone: '9845012345', whatsapp: '9845012345', role: 'agent', bio: 'Helping families find homes in Bengaluru, Hyderabad and Chennai.' }, 'Agent@12345'),
    await mkUser({ name: 'Rohit Verma', email: 'rohit@propertyhub.in', phone: '9811122233', whatsapp: '9811122233', role: 'agent', bio: 'Delhi NCR residential and commercial specialist.' }, 'Agent@12345'),
  ];
  await mkUser({ name: 'Demo Buyer', email: 'buyer@propertyhub.in', phone: '9123456780', role: 'buyer' }, 'Buyer@12345');

  if ((await Property.countDocuments()) >= 30) {
    logger.info('Seed: properties already present, skipping');
    return;
  }

  const cities = Object.entries(LOCALITIES);
  const agentFor = (city) => (['Mumbai', 'Pune'].includes(city) ? agents[0] : ['Delhi', 'Gurugram'].includes(city) ? agents[2] : agents[1]);
  const docs = [];
  for (let i = 0; i < 30; i++) {
    const [city, info] = cities[i % cities.length];
    const [loc, lat, lng] = pick(info.spots, Math.floor(i / cities.length));
    const [type, purpose, beds, baths, area, basePrice, furnishing] = pick(TEMPLATES, i);
    const cityFactor = { Mumbai: 1.6, Delhi: 1.3, Gurugram: 1.2, Bengaluru: 1.1, Pune: 0.9, Hyderabad: 0.95, Chennai: 0.9 }[city];
    const price = Math.round((basePrice * cityFactor) / (purpose === 'rent' ? 500 : 50000)) * (purpose === 'rent' ? 500 : 50000);
    const pool = type === 'commercial' ? OFFICE.concat(INTERIOR.slice(0, 2)) : type === 'plot' ? EXTERIOR : [pick(EXTERIOR, i), ...INTERIOR];
    const images = Array.from({ length: type === 'plot' ? 2 : 4 }, (_, k) => img(pick(pool, i + k)));
    const title = TITLES[type](beds, loc);
    const amen = AMENITY_SETS[type].filter((_, k) => (k + i) % 3 !== 0);
    docs.push({
      title,
      slug: `${slugify(`${title} ${city}`)}-${crypto.randomBytes(3).toString('hex')}`,
      description: describe(type, purpose, loc, city),
      type,
      purpose,
      price,
      areaSqft: area + ((i * 17) % 200),
      bedrooms: beds,
      bathrooms: baths,
      furnishing,
      amenities: amen,
      address: { line: `${100 + i}, ${loc} Main Road`, locality: loc, city, state: info.state, pincode: `${info.pin}${String(10 + (i % 90)).padStart(3, '0')}` },
      location: { type: 'Point', coordinates: [jitter(lng, i), jitter(lat, i + 3)] },
      images,
      status: i === 28 || i === 29 ? 'pending' : 'approved',
      featured: i % 5 === 0 && i < 28,
      owner: agentFor(city)._id,
      views: (i * 53) % 400,
      approvedAt: new Date(),
      createdAt: new Date(Date.now() - i * 6 * 3600000),
    });
  }
  await Property.insertMany(docs);
  logger.info(`Seed complete: 1 admin, 3 agents, 1 buyer, ${docs.length} properties, 1 plan`);
}

// Run directly: `npm run seed` (add `-- --reset` to wipe first)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    if (env.mongoUri === 'memory') {
      console.log('MONGODB_URI=memory auto-seeds on `npm run dev`. Set a real MONGODB_URI to seed Atlas.');
      process.exit(0);
    }
    await connectDB();
    await seed({ reset: process.argv.includes('--reset') });
    console.log(`Admin: ${env.seed.adminEmail} / ${env.seed.adminPassword}`);
    console.log('Agents: priya@ / arjun@ / rohit@propertyhub.in  password Agent@12345');
    console.log('Buyer:  buyer@propertyhub.in  password Buyer@12345');
    await disconnectDB();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
