import { ApiError } from '../utils/ApiError.js';
import { zodFieldErrors } from '@propertyhub/shared';

/** Validates req[source] with a Zod schema and replaces it with the parsed (coerced) value. */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(ApiError.badRequest('Validation failed', zodFieldErrors(result.error)));
    }
    if (source === 'query') req.validQuery = result.data;
    else req[source] = result.data;
    next();
  };

export const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));
