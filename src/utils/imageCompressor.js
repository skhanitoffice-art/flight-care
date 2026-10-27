// src/utils/imageCompressor.js
// Flight Care Enterprise - Client-Side Image Compression & Optimization Utility
// Prevents QuotaExceededError in localStorage and Firestore 1MB document size limits
// Scales photos to crystal-clear 480x480 max resolution at 0.82 JPEG quality (~25-45 KB)

import { Platform } from 'react-native';

/**
 * Compresses an image File, Blob, or base64 string to a lightweight, high-quality JPEG Data URL.
 * 
 * @param {File|Blob|string} imageSource - Web File/Blob object or base64 Data URL
 * @param {Object} options
 * @param {number} [options.maxWidth=480] - Maximum width in pixels
 * @param {number} [options.maxHeight=480] - Maximum height in pixels
 * @param {number} [options.quality=0.82] - JPEG quality between 0.1 and 1.0
 * @returns {Promise<string>} Compressed Base64 Data URL (e.g. 'data:image/jpeg;base64,...')
 */
export const compressImage = (imageSource, options = {}) => {
  const {
    maxWidth = 480,
    maxHeight = 480,
    quality = 0.82,
  } = options;

  return new Promise((resolve, reject) => {
    // If not on Web or document/canvas unavailable, return source directly or resolve gracefully
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      if (typeof imageSource === 'string') {
        return resolve(imageSource);
      }
      return resolve(null);
    }

    // If source is already a remote HTTP/HTTPS URL, don't recompress
    if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
      return resolve(imageSource);
    }

    const processDataUrl = (dataUrl) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Maintain aspect ratio while clamping to maxWidth and maxHeight
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Ensure minimum valid dimensions
          width = Math.max(1, width);
          height = Math.max(1, height);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(dataUrl); // Fallback to original if 2D context fails
          }

          // Enable high-quality bilinear image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // White background in case the source image has PNG transparency
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Draw scaled image
          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed JPEG
          const compressedResult = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedResult);
        } catch (err) {
          console.warn('[imageCompressor] Canvas compression failed, falling back to original:', err);
          resolve(dataUrl);
        }
      };

      img.onerror = (err) => {
        console.warn('[imageCompressor] Image loading error, falling back to original:', err);
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    // If imageSource is a File or Blob, read it with FileReader first
    if (typeof File !== 'undefined' && imageSource instanceof File || typeof Blob !== 'undefined' && imageSource instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          processDataUrl(result);
        } else {
          reject(new Error('FileReader returned empty result.'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(imageSource);
    } else if (typeof imageSource === 'string') {
      processDataUrl(imageSource);
    } else {
      resolve(null);
    }
  });
};

export default compressImage;

