/** Consistent JSON envelope: { success, data, meta? } */
export const ok = (res, data, meta, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

export const created = (res, data) => ok(res, data, undefined, 201);

export const paginate = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 1,
  hasMore: page * limit < total,
});
