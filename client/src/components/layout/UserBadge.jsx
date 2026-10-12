// "Alquien Capes Capuyan" -> "AC"
function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// The round initials plus the name and role, shown in the top bar.
function UserBadge({ name, roleLabel }) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-orange font-semibold text-white">
        {getInitials(name)}
      </span>
      <span className="hidden text-left sm:block">
        <span className="block max-w-48 truncate font-semibold text-gray-900">{name}</span>
        <span className="block text-sm text-brand-muted">{roleLabel}</span>
      </span>
    </>
  );
}

export default UserBadge;
