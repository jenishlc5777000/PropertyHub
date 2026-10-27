import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const useCloudinary = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
if (useCloudinary) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

/** Uploads an image buffer. Returns { url, publicId }. */
export async function uploadImage(buffer, folder = 'properties') {
  if (useCloudinary) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `propertyhub/${folder}`,
          resource_type: 'image',
          transformation: [{ width: 1600, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
        },
        (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
      );
      stream.end(buffer);
    });
  }
  // Local fallback for development only.
  await fs.mkdir(path.join(UPLOAD_DIR, folder), { recursive: true });
  const name = `${crypto.randomUUID()}.jpg`;
  await fs.writeFile(path.join(UPLOAD_DIR, folder, name), buffer);
  return { url: `${env.apiUrl}/uploads/${folder}/${name}`, publicId: `local:${folder}/${name}` };
}

export async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    if (publicId.startsWith('local:')) {
      await fs.unlink(path.join(UPLOAD_DIR, publicId.slice(6)));
    } else if (publicId.startsWith('seed:')) {
      // seeded remote images, nothing to delete
    } else if (useCloudinary) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (e) {
    logger.warn('Image delete failed', publicId, e.message);
  }
}
