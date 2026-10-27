import { env } from './env.js';

const bearer = [{ bearerAuth: [] }];
const json = (schemaRef) => ({ content: { 'application/json': { schema: { $ref: schemaRef } } } });
const okResp = (description = 'OK') => ({ 200: { description } });
const path = (tag, summary, { auth = false, body, params = [], query = [], responses } = {}) => ({
  tags: [tag],
  summary,
  ...(auth ? { security: bearer } : {}),
  parameters: [
    ...params.map((name) => ({ name, in: 'path', required: true, schema: { type: 'string' } })),
    ...query.map((name) => ({ name, in: 'query', schema: { type: 'string' } })),
  ],
  ...(body ? { requestBody: { required: true, ...json(body) } } : {}),
  responses: responses || okResp(),
});

/** Hand-written OpenAPI 3 spec served at /api/docs. */
export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'PropertyHub API',
    version: '1.0.0',
    description:
      'REST API for PropertyHub. All responses use `{ success, data, meta? }` or `{ success: false, error: { code, message, details? } }`. ' +
      'Authenticate with `Authorization: Bearer <accessToken>`; refresh via POST /auth/refresh.',
  },
  servers: [{ url: `${env.apiUrl}/api/v1` }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Register: {
        type: 'object',
        required: ['name', 'email', 'phone', 'password'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string', example: '9876543210' },
          password: { type: 'string', example: 'Secret123' },
          role: { type: 'string', enum: ['buyer', 'agent'] },
        },
      },
      Login: {
        type: 'object',
        properties: { email: { type: 'string', example: 'buyer@propertyhub.in' }, password: { type: 'string', example: 'Buyer@12345' } },
      },
      Refresh: { type: 'object', properties: { refreshToken: { type: 'string' } } },
      Email: { type: 'object', properties: { email: { type: 'string' } } },
      Reset: { type: 'object', properties: { email: { type: 'string' }, otp: { type: 'string' }, password: { type: 'string' } } },
      Inquiry: { type: 'object', properties: { propertyId: { type: 'string' }, message: { type: 'string' } } },
      Message: { type: 'object', properties: { text: { type: 'string' } } },
      Visit: {
        type: 'object',
        properties: {
          propertyId: { type: 'string' },
          date: { type: 'string', format: 'date' },
          slot: { type: 'string', enum: ['morning', 'afternoon', 'evening'] },
          note: { type: 'string' },
        },
      },
      CreateOrder: { type: 'object', properties: { planId: { type: 'string' }, promoCode: { type: 'string' } } },
      VerifyPayment: {
        type: 'object',
        properties: {
          razorpay_order_id: { type: 'string' },
          razorpay_payment_id: { type: 'string' },
          razorpay_signature: { type: 'string' },
        },
      },
      Plan: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number', example: 999 },
          credits: { type: 'integer', example: 100 },
          validityDays: { type: 'integer', example: 365 },
          active: { type: 'boolean' },
        },
      },
      GrantCredits: {
        type: 'object',
        properties: { amount: { type: 'integer', example: 10 }, kind: { type: 'string', enum: ['free', 'paid'] }, reason: { type: 'string' } },
      },
      Property: {
        type: 'object',
        description: 'Send as JSON in a multipart field named `data`, with image files in `images` (max 10).',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['apartment', 'villa', 'house', 'plot', 'commercial'] },
          purpose: { type: 'string', enum: ['sale', 'rent'] },
          price: { type: 'number' },
          areaSqft: { type: 'number' },
          bedrooms: { type: 'integer' },
          bathrooms: { type: 'integer' },
          furnishing: { type: 'string' },
          amenities: { type: 'array', items: { type: 'string' } },
          address: {
            type: 'object',
            properties: { line: { type: 'string' }, locality: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, pincode: { type: 'string' } },
          },
          lat: { type: 'number' },
          lng: { type: 'number' },
        },
      },
    },
  },
  paths: {
    '/auth/register': { post: path('Auth', 'Register (grants free credits)', { body: '#/components/schemas/Register' }) },
    '/auth/login': { post: path('Auth', 'Log in', { body: '#/components/schemas/Login' }) },
    '/auth/refresh': { post: path('Auth', 'Rotate refresh token', { body: '#/components/schemas/Refresh' }) },
    '/auth/logout': { post: path('Auth', 'Revoke refresh token', { body: '#/components/schemas/Refresh' }) },
    '/auth/forgot-password': { post: path('Auth', 'Email a 6-digit OTP', { body: '#/components/schemas/Email' }) },
    '/auth/reset-password': { post: path('Auth', 'Reset password with OTP', { body: '#/components/schemas/Reset' }) },

    '/users/me': { get: path('Users', 'Current user', { auth: true }), patch: path('Users', 'Update profile', { auth: true }) },
    '/users/me/password': { post: path('Users', 'Change password', { auth: true }) },
    '/users/me/avatar': { post: path('Users', 'Upload avatar (multipart field `avatar`)', { auth: true }) },
    '/users/me/push-token': { post: path('Users', 'Register Expo push token', { auth: true }) },
    '/users/me/become-agent': { post: path('Users', 'Upgrade buyer to owner/agent', { auth: true }) },
    '/users/me/stats': { get: path('Users', 'Agent dashboard stats', { auth: true }) },
    '/users/agents/{id}': { get: path('Users', 'Public agent profile + listings', { params: ['id'] }) },

    '/properties': {
      get: path('Properties', 'Search approved listings', {
        query: ['q', 'city', 'locality', 'type', 'purpose', 'minPrice', 'maxPrice', 'beds', 'furnishing', 'amenities', 'sort', 'page', 'limit'],
      }),
      post: path('Properties', 'Create listing (agent/admin, multipart)', { auth: true }),
    },
    '/properties/near': { get: path('Properties', 'Listings near a point (2dsphere)', { query: ['lat', 'lng', 'radiusKm', 'purpose', 'limit'] }) },
    '/properties/featured': { get: path('Properties', 'Featured listings') },
    '/properties/mine': { get: path('Properties', 'My listings (all statuses)', { auth: true, query: ['status', 'page'] }) },
    '/properties/{idOrSlug}': { get: path('Properties', 'Listing detail (contact masked unless unlocked)', { params: ['idOrSlug'] }) },
    '/properties/{id}': {
      patch: path('Properties', 'Update listing (owner/admin, multipart)', { auth: true, params: ['id'] }),
      delete: path('Properties', 'Delete listing', { auth: true, params: ['id'] }),
    },
    '/properties/{id}/similar': { get: path('Properties', 'Similar listings', { params: ['id'] }) },
    '/properties/{id}/status': { patch: path('Properties', 'Mark sold / rented / relist', { auth: true, params: ['id'] }) },
    '/properties/{id}/unlock-contact': {
      post: path('Credits', 'Spend 1 credit to reveal contact (free if already unlocked)', {
        auth: true,
        params: ['id'],
        responses: { 200: { description: 'Contact + new balance' }, 402: { description: 'NO_CREDITS' }, 400: { description: 'OWN_LISTING / NOT_APPROVED' } },
      }),
    },

    '/favorites': { get: path('Favorites', 'My favorites', { auth: true }) },
    '/favorites/ids': { get: path('Favorites', 'IDs of my favorites', { auth: true }) },
    '/favorites/{propertyId}': {
      post: path('Favorites', 'Add favorite', { auth: true, params: ['propertyId'] }),
      delete: path('Favorites', 'Remove favorite', { auth: true, params: ['propertyId'] }),
    },

    '/inquiries': {
      get: path('Inquiries', 'My threads (role=buyer|agent)', { auth: true, query: ['role'] }),
      post: path('Inquiries', 'Send inquiry', { auth: true, body: '#/components/schemas/Inquiry' }),
    },
    '/inquiries/{id}': { get: path('Inquiries', 'Thread detail', { auth: true, params: ['id'] }) },
    '/inquiries/{id}/messages': { post: path('Inquiries', 'Reply', { auth: true, params: ['id'], body: '#/components/schemas/Message' }) },

    '/visits': {
      get: path('Visits', 'My visits', { auth: true, query: ['role'] }),
      post: path('Visits', 'Request a visit', { auth: true, body: '#/components/schemas/Visit' }),
    },
    '/visits/{id}': { patch: path('Visits', 'Confirm / cancel / complete', { auth: true, params: ['id'] }) },

    '/notifications': { get: path('Notifications', 'List', { auth: true }) },
    '/notifications/read-all': { patch: path('Notifications', 'Mark all read', { auth: true }) },
    '/notifications/{id}/read': { patch: path('Notifications', 'Mark read', { auth: true, params: ['id'] }) },

    '/credits/balance': { get: path('Credits', 'Credit balance', { auth: true }) },
    '/unlocked-contacts': { get: path('Credits', 'Unlock history', { auth: true, query: ['page'] }) },
    '/plans': { get: path('Payments', 'Active plans') },
    '/payments/create-order': { post: path('Payments', 'Create Razorpay order (price read from Plan)', { auth: true, body: '#/components/schemas/CreateOrder' }) },
    '/payments/verify': { post: path('Payments', 'Verify checkout signature and credit wallet', { auth: true, body: '#/components/schemas/VerifyPayment' }) },
    '/payments/failed': { post: path('Payments', 'Report a failed/cancelled checkout', { auth: true }) },
    '/payments/webhook': { post: path('Payments', 'Razorpay webhook (X-Razorpay-Signature)') },
    '/payments/orders': { get: path('Payments', 'Purchase history', { auth: true }) },
    '/payments/orders/{id}/invoice': { get: path('Payments', 'Download invoice PDF', { auth: true, params: ['id'] }) },

    '/admin/stats': { get: path('Admin', 'Overview stats', { auth: true }) },
    '/admin/revenue': { get: path('Admin', 'Daily revenue / unlocks + top properties', { auth: true, query: ['days'] }) },
    '/admin/properties': { get: path('Admin', 'All listings', { auth: true, query: ['status', 'q', 'page'] }) },
    '/admin/properties/{id}/approve': { patch: path('Admin', 'Approve listing', { auth: true, params: ['id'] }) },
    '/admin/properties/{id}/reject': { patch: path('Admin', 'Reject listing', { auth: true, params: ['id'] }) },
    '/admin/properties/{id}/feature': { patch: path('Admin', 'Toggle featured', { auth: true, params: ['id'] }) },
    '/admin/users': { get: path('Admin', 'Users with balances', { auth: true, query: ['q', 'role', 'page'] }) },
    '/admin/users/{id}': { patch: path('Admin', 'Change role / disable', { auth: true, params: ['id'] }) },
    '/admin/users/{id}/credits': { post: path('Admin', 'Grant or revoke credits', { auth: true, params: ['id'], body: '#/components/schemas/GrantCredits' }) },
    '/admin/plans': {
      get: path('Admin', 'All plans', { auth: true }),
      post: path('Admin', 'Create plan', { auth: true, body: '#/components/schemas/Plan' }),
    },
    '/admin/plans/{id}': { patch: path('Admin', 'Edit plan', { auth: true, params: ['id'], body: '#/components/schemas/Plan' }) },
    '/admin/settings': { get: path('Admin', 'Settings', { auth: true }), patch: path('Admin', 'Update freeCredits', { auth: true }) },
    '/admin/orders': { get: path('Admin', 'All orders', { auth: true, query: ['status', 'page'] }) },
    '/admin/orders/{id}/refund': { post: path('Admin', 'Refund order via Razorpay', { auth: true, params: ['id'] }) },
    '/admin/promos': { get: path('Admin', 'Promo codes', { auth: true }), post: path('Admin', 'Create promo', { auth: true }) },
    '/admin/promos/{id}': { patch: path('Admin', 'Edit promo', { auth: true, params: ['id'] }) },
    '/admin/audit/suspicious': { get: path('Admin', 'Suspicious activity log', { auth: true }) },
  },
};
