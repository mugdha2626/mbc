/**
 * Image utility functions for client-side compression and base64 conversion
 */

export interface CompressedImage {
  base64: string;
  width: number;
  height: number;
  sizeKB: number;
}

/**
 * Compress and resize an image file to base64
 * @param file - The image file from input
 * @param maxWidth - Maximum width (default 800px)
 * @param maxHeight - Maximum height (default 800px)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Promise with base64 string and metadata
 */
export async function compressImageToBase64(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      reject(new Error("File must be an image"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Round dimensions
        width = Math.round(width);
        height = Math.round(height);

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 JPEG
        const base64 = canvas.toDataURL("image/jpeg", quality);

        // Calculate approximate size in KB
        // base64 string length * 0.75 gives approximate bytes (base64 overhead)
        const sizeKB = Math.round((base64.length * 0.75) / 1024);

        resolve({
          base64,
          width,
          height,
          sizeKB,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file before processing
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default 10MB)
 * @returns Object with isValid and error message
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): { isValid: boolean; error?: string } {
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "Please upload a JPEG, PNG, WebP, or GIF image",
    };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      isValid: false,
      error: `Image must be smaller than ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
}
