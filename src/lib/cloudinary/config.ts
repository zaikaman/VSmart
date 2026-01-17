import { v2 as cloudinary } from 'cloudinary';

// Cấu hình Cloudinary
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
});

export default cloudinary;

// Helper function để upload ảnh
export async function uploadToCloudinary(
  file: File | Buffer,
  folder: string = 'avatars'
): Promise<{ url: string; publicId: string }> {
  try {
    let base64String: string;

    if (Buffer.isBuffer(file)) {
      base64String = `data:image/jpeg;base64,${file.toString('base64')}`;
    } else {
      // Convert File to base64
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || 'image/jpeg';
      base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    const result = await cloudinary.uploader.upload(base64String, {
      folder: folder,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Không thể upload ảnh');
  }
}

// Helper function để xóa ảnh cũ
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    // Không throw error vì xóa ảnh cũ không phải critical
  }
}

// Helper function để lấy URL ảnh đã transform
export function getCloudinaryUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  }
): string {
  const defaultOptions = {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  };

  return cloudinary.url(publicId, defaultOptions);
}
