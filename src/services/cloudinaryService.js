/**
 * Cloudinary service for direct image uploads from React Native
 * Uses unsigned upload preset (same approach as admin-dashboard)
 */

const CLOUDINARY_CLOUD_NAME = 'dnrb4puwj';
const CLOUDINARY_API_KEY = '726115716791771';
const CLOUDINARY_UPLOAD_PRESET = 'jyotish_call';

/**
 * Upload image to Cloudinary directly from React Native
 * @param {string} base64Image - Base64 encoded image data (with or without data URI prefix)
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with url, publicId, width, height, size, format
 */
export const uploadImageToCloudinary = async (base64Image, options = {}) => {
  try {
    // Ensure base64 has proper data URI prefix
    let imageData = base64Image;
    if (!base64Image.startsWith('data:')) {
      imageData = `data:image/jpeg;base64,${base64Image}`;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', imageData);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY);
    
    // Add folder for chat images
    const folder = options.folder || 'jyotishcall/chat_images';
    formData.append('folder', folder);

    console.log('📷 [CLOUDINARY] Uploading image to Cloudinary...');

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('📷 [CLOUDINARY] Upload failed:', errorData);
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();

    console.log('📷 [CLOUDINARY] Upload successful:', {
      publicId: data.public_id,
      url: data.secure_url?.substring(0, 50),
      width: data.width,
      height: data.height,
    });

    return {
      success: true,
      data: {
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
        size: data.bytes,
        format: data.format,
      },
    };
  } catch (error) {
    console.error('📷 [CLOUDINARY] Upload error:', error);
    return {
      success: false,
      message: error.message || 'Failed to upload image',
    };
  }
};

/**
 * Upload chat image to Cloudinary
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} - Upload result
 */
export const uploadChatImage = async (base64Image) => {
  return uploadImageToCloudinary(base64Image, {
    folder: 'jyotishcall/chat_images',
  });
};

export default {
  uploadImageToCloudinary,
  uploadChatImage,
};
