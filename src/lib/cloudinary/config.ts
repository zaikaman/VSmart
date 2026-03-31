const cloudinaryUrl = process.env.CLOUDINARY_URL;
const hasValidCloudinaryUrl =
  typeof cloudinaryUrl === 'string' && cloudinaryUrl.startsWith('cloudinary://');

if (!hasValidCloudinaryUrl && process.env.CLOUDINARY_URL) {
  delete process.env.CLOUDINARY_URL;
}

// Dùng require sau khi đã sanitize env để tránh cloudinary parse placeholder ngay lúc import module.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cloudinary = require('cloudinary').v2;

if (hasValidCloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: cloudinaryUrl,
  });
}

function ensureCloudinaryConfigured() {
  if (!hasValidCloudinaryUrl) {
    throw new Error('CLOUDINARY_URL chưa hợp lệ. Vui lòng cấu hình cloudinary://...');
  }
}

export default cloudinary;

export async function uploadToCloudinary(
  file: File | Buffer,
  folder: string = 'avatars'
): Promise<{ url: string; publicId: string }> {
  try {
    ensureCloudinaryConfigured();
    let base64String: string;

    if (Buffer.isBuffer(file)) {
      base64String = `data:image/jpeg;base64,${file.toString('base64')}`;
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || 'image/jpeg';
      base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      format: 'webp',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Không thể upload ảnh');
  }
}

export async function uploadFileToCloudinary(
  file: File,
  folder: string
): Promise<{ url: string; publicId: string }> {
  try {
    ensureCloudinaryConfigured();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/octet-stream';
    const base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw new Error('Không thể upload file');
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    ensureCloudinaryConfigured();
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
}

export function getCloudinaryUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  }
): string {
  ensureCloudinaryConfigured();

  const defaultOptions = {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto:good',
    fetch_format: 'auto',
    ...options,
  };

  return cloudinary.url(publicId, defaultOptions);
}
