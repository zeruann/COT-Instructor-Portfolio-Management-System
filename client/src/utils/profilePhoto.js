/**
 * Resizes and center-crops an image File into a 256x256 JPEG data URL
 * so profile photos stay lightweight in MongoDB.
 */
export function resizeProfileImage(file, size = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, or WebP).'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Image file must be smaller than 10 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read the selected image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas is not supported in this browser.'));
          return;
        }

        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function isCustomPhotoUrl(photoUrl, googlePhotoUrl) {
  if (!photoUrl) return false;
  if (googlePhotoUrl && photoUrl === googlePhotoUrl) return false;
  if (photoUrl.startsWith('https://lh3.googleusercontent.com')) return false;
  return true;
}

export function resolveAvatarUrl(profilePhotoUrl, googlePhotoUrl) {
  return profilePhotoUrl || googlePhotoUrl || '';
}

