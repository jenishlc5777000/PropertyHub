import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.DEFAULT_FREE_CREDITS = '3';

const { default: request } = await import('supertest');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { seed } = await import('../src/seed/seed.js');
const { Property, Plan, Order } = await import('../src/models/index.js');

let app;
let props;

before(async () => {
  await connectDB('memory');
  await seed();
  app = createApp();
  props = await Property.find({ status: 'approved' }).sort({ createdAt: -1 }).lean();
});

after(async () => {
  await disconnectDB();
});

let n = 0;
async function newUser(role = 'buyer') {
  n += 1;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test User ${n}`, email: `t${n}_${Date.now()}@example.com`, phone: '9988776655', password: 'Passw0rd!', role });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { token: res.body.data.accessToken, user: res.body.data.user, balance: res.body.data.balance };
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

test('new users get the configured free credits', async () => {
  const { balance } = await newUser();
  assert.equal(balance.free, 3);
  assert.equal(balance.paid, 0);
});

test('property API masks contact unless unlocked', async () => {
  const res = await request(app).get(`/api/v1/properties/${props[0]._id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.contact.masked, true);
  assert.match(res.body.data.contact.phone, /^\d{2}X+\d{2}$/);
  assert.ok(!JSON.stringify(res.body).includes('9876543210') && !JSON.stringify(res.body).includes('9845012345'));
});

test('unlock spends one credit, re-open is free, detail is then unmasked', async () => {
  const { token } = await newUser();
  const id = props[1]._id;
  const r1 = await request(app).post(`/api/v1/properties/${id}/unlock-contact`).set(auth(token));
  assert.equal(r1.status, 200, JSON.stringify(r1.body));
  assert.equal(r1.body.data.alreadyUnlocked, false);
  assert.equal(r1.body.data.balance.free, 2);
  assert.match(r1.body.data.contact.phone, /^\d{10}$/);

  const r2 = await request(app).post(`/api/v1/properties/${id}/unlock-contact`).set(auth(token));
  assert.equal(r2.body.data.alreadyUnlocked, true);
  assert.equal(r2.body.data.balance.free, 2);

  const d = await request(app).get(`/api/v1/properties/${id}`).set(auth(token));
  assert.equal(d.body.data.contact.masked, false);
});

test('parallel double-taps on the same property charge only once', async () => {
  const { token } = await newUser();
  const id = props[2]._id;
  const results = await Promise.all(
    Array.from({ length: 8 }, () => request(app).post(`/api/v1/properties/${id}/unlock-contact`).set(auth(token)))
  );
  results.forEach((r) => assert.equal(r.status, 200, JSON.stringify(r.body)));
  const bal = await request(app).get('/api/v1/credits/balance').set(auth(token));
  assert.equal(bal.body.data.free, 2);
});

test('parallel unlocks of different properties never go negative', async () => {
  const { token } = await newUser(); // 3 credits
  const ids = props.slice(3, 10).map((p) => p._id);
  const results = await Promise.all(
    ids.map((id) => request(app).post(`/api/v1/properties/${id}/unlock-contact`).set(auth(token)))
  );
  const okCount = results.filter((r) => r.status === 200).length;
  const noCredits = results.filter((r) => r.status === 402).length;
  assert.equal(okCount, 3);
  assert.equal(noCredits, 4);
  const bal = await request(app).get('/api/v1/credits/balance').set(auth(token));
  assert.equal(bal.body.data.total, 0);
  const hist = await request(app).get('/api/v1/unlocked-contacts').set(auth(token));
  assert.equal(hist.body.meta.total, 3);
});

test('cannot unlock own listing or a pending listing', async () => {
  const agent = await request(app).post('/api/v1/auth/login').send({ email: 'priya@propertyhub.in', password: 'Agent@12345' });
  const own = props.find((p) => String(p.owner) === agent.body.data.user._id);
  const r = await request(app).post(`/api/v1/properties/${own._id}/unlock-contact`).set(auth(agent.body.data.accessToken));
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'OWN_LISTING');

  const { token } = await newUser();
  const pending = await Property.findOne({ status: 'pending' });
  const r2 = await request(app).post(`/api/v1/properties/${pending._id}/unlock-contact`).set(auth(token));
  assert.equal(r2.status, 400);
  assert.equal(r2.body.error.code, 'NOT_APPROVED');
});

test('payment: price comes from plan, verify is idempotent, free credits are spent first', async () => {
  const { token } = await newUser();
  const plan = await Plan.findOne();
  const o = await request(app).post('/api/v1/payments/create-order').set(auth(token)).send({ planId: String(plan._id) });
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal(o.body.data.amount, 999);
  assert.equal(o.body.data.mock, true);

  const body = { razorpay_order_id: o.body.data.razorpayOrderId, razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_signature: 'mock' };
  const v1 = await request(app).post('/api/v1/payments/verify').set(auth(token)).send(body);
  const v2 = await request(app).post('/api/v1/payments/verify').set(auth(token)).send(body);
  assert.equal(v1.status, 200, JSON.stringify(v1.body));
  assert.equal(v2.body.data.alreadyProcessed, true);
  assert.equal(v2.body.data.balance.paid, 100);
  assert.equal(v2.body.data.balance.free, 3);

  const order = await Order.findOne({ razorpayOrderId: body.razorpay_order_id });
  assert.equal(order.gstAmount, 152.39);
  assert.equal(order.baseAmount, 846.61);
  assert.match(order.invoiceNo, /^PH\/\d{4}-\d{2}\/\d{6}$/);

  const u = await request(app).post(`/api/v1/properties/${props[11]._id}/unlock-contact`).set(auth(token));
  assert.equal(u.body.data.creditType, 'free');
  assert.equal(u.body.data.balance.paid, 100);

  const bad = await request(app).post('/api/v1/payments/verify').set(auth(token)).send({ ...body, razorpay_signature: 'nope' });
  assert.equal(bad.status, 400);

  const inv = await request(app).get(`/api/v1/payments/orders/${order._id}/invoice`).set(auth(token));
  assert.equal(inv.status, 200);
  assert.equal(inv.headers['content-type'], 'application/pdf');
});

test('webhook: rejects bad signature, credits once on payment.captured retries', async () => {
  const { token } = await newUser();
  const plan = await Plan.findOne();
  const o = await request(app).post('/api/v1/payments/create-order').set(auth(token)).send({ planId: String(plan._id) });
  const event = {
    event: 'payment.captured',
    payload: { payment: { entity: { id: `pay_wh_${Date.now()}`, order_id: o.body.data.razorpayOrderId, amount: 99900 } } },
  };
  const raw = JSON.stringify(event);
  const sig = crypto.createHmac('sha256', 'test_webhook_secret').update(raw).digest('hex');

  const badSig = await request(app).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', 'x').send(raw);
  assert.equal(badSig.status, 400);

  for (let i = 0; i < 3; i++) {
    const r = await request(app).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', sig).send(raw);
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  const bal = await request(app).get('/api/v1/credits/balance').set(auth(token));
  assert.equal(bal.body.data.paid, 100);
});

test('search filters, text search and near-me work', async () => {
  const r = await request(app).get('/api/v1/properties').query({ city: 'Bengaluru', purpose: 'sale', sort: 'price_asc' });
  assert.equal(r.status, 200);
  assert.ok(r.body.data.length > 0);
  r.body.data.forEach((p) => assert.equal(p.address.city, 'Bengaluru'));
  const prices = r.body.data.filter((p) => !p.featured).map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));

  const t = await request(app).get('/api/v1/properties').query({ q: 'villa' });
  assert.ok(t.body.data.every((p) => /villa/i.test(p.title + p.description)));

  const near = await request(app).get('/api/v1/properties/near').query({ lat: 12.97, lng: 77.6, radiusKm: 30 });
  assert.equal(near.status, 200);
  assert.ok(near.body.data.length > 0);
  near.body.data.forEach((p) => assert.ok(p.distanceKm <= 30));
});
