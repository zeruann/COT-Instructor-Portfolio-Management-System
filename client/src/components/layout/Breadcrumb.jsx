import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { NAV, findMenuItem } from '../../config/navigation';

// The small "Home > Faculty Portfolio" line under the top bar.
function Breadcrumb({ role }) {
  const { pathname } = useLocation();
  const menu = NAV[role];
  if (!menu) return null;

  const match = findMenuItem(role, pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-9 shrink-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-gray-200 bg-white px-4 text-sm text-brand-gray sm:px-6"
    >
      <Link to={menu.homePath} className="hover:text-brand-orange">
        Home
      </Link>

      {match && menu.showSectionInBreadcrumb && match.heading && (
        <>
          <ChevronRight size={14} />
          <span>{match.heading}</span>
        </>
      )}

      {match && (
        <>
          <ChevronRight size={14} />
          <span aria-current="page" className="text-gray-900">
            {match.item.label}
          </span>
        </>
      )}
    </nav>
  );
}

export default Breadcrumb;
