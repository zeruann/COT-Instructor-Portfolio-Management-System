import { useState } from 'react';
import { User } from 'lucide-react';
import { resolveAvatarUrl } from '../utils/profilePhoto';

/**
 * Circular avatar that renders a user photo with `no-referrer` (needed for Google
 * avatars) and falls back cleanly to either a custom `fallback` or an orange
 * person icon when no photo exists or loading fails.
 */
function InstructorAvatar({
  src,
  googlePhotoUrl,
  alt = 'Instructor',
  size = 'w-14 h-14',
  iconSize = 24,
  iconClassName = '',
  className = 'bg-orange-50',
  fallback = null,
}) {
  const [failedUrl, setFailedUrl] = useState(null);
  const resolvedSrc = resolveAvatarUrl(src, googlePhotoUrl);
  const showImage = Boolean(resolvedSrc) && failedUrl !== resolvedSrc;

  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
    >
      {showImage ? (
        <img
          src={resolvedSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(resolvedSrc)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        fallback || (
          <User
            size={iconSize}
            className={iconClassName || 'text-orange-400'}
            strokeWidth={1.7}
            aria-hidden="true"
          />
        )
      )}
    </span>
  );
}

export default InstructorAvatar;
