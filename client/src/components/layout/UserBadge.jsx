import { useState } from 'react';

// "Alquien Capes Capuyan" -> "AC"
function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

// The round initials or profile image plus the name and role, shown in the top bar.
function UserBadge({ name, roleLabel, avatarUrl }) {
  const [imgError, setImgError] = useState(false);

  return (
    <>
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-11 w-11 rounded-full object-cover shrink-0 border border-gray-200"
        />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-orange font-semibold text-white shrink-0">
          {getInitials(name)}
        </span>
      )}
      <span className="hidden text-left sm:block">
        <span className="block max-w-48 truncate font-semibold text-gray-900">{name}</span>
        <span className="block text-sm text-brand-muted">{roleLabel}</span>
      </span>
    </>
  );
}

export default UserBadge;
