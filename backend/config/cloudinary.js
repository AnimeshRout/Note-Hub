import { v2 as cloudinary } from 'cloudinary';

export const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

/**
 * Upload a base64 file to Cloudinary
 * @param {string} base64Data - The base64 string (data URL or raw base64)
 * @param {object} options - Upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
export const uploadToCloudinary = async (base64Data, options = {}) => {
  const defaultOptions = {
    folder: 'notes-app',
    resource_type: 'auto',
    ...options,
  };

  const result = await cloudinary.uploader.upload(base64Data, defaultOptions);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    resourceType: result.resource_type,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    duration: result.duration,
  };
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file
 * @param {string} resourceType - The resource type (image, video, raw)
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export default cloudinary;
