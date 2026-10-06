/**
 * High-performance Client-side Image Compression Utility
 * Resizes and compresses image files into lightweight web-optimized JPEG data URLs.
 * Reduces 4MB+ raw uploads to ~30KB-60KB while maintaining crisp clarity for cards, badges, and printing.
 */

export async function compressImageFile(
  file: File, 
  maxDimension: number = 800, 
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, resolve directly with FileReader
    if (!file.type.startsWith('image/')) {
      const fallbackReader = new FileReader();
      fallbackReader.onload = (e) => resolve(e.target?.result as string);
      fallbackReader.onerror = reject;
      fallbackReader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };

      img.onerror = () => {
        // Fallback to original if image load fails
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
