import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { NAV, findMenuItem, findSubPage } from '../../config/navigation';

// The small "Home > Faculty Portfolio > Research" line under the top bar.

function Breadcrumb({ role }) {
  const { pathname } = useLocation();

  const menu = NAV[role];

  if (!menu) return null;

  // Find the current sub-page independently of the sidebar menu item.

  const subPage = findSubPage(role, pathname);

  // Find the parent sidebar item when the current page is a shared sub-page.

  let match = null;

  if (subPage?.parentTo) {
    for (const section of menu.sections) {
      const item = section.items.find(
        (entry) => entry.to === subPage.parentTo
      );

      if (item) {
        match = { heading: section.heading, item };
        break;
      }
    }
  }

  // Regular pages fall back to their direct sidebar or top-bar menu item.

  if (!match) {
    match = findMenuItem(role, pathname);
  }

  // Find the appropriate parent for shared portfolio pages if needed.

  if (!match && subPage) {
    const parentTo = subPage.parentTo;

    if (parentTo) {
      for (const section of menu.sections) {
        const item = section.items.find(
          (entry) => entry.to === parentTo
        );

        if (item) {
          match = { heading: section.heading, item };
          break;
        }
      }
    }
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-9 shrink-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-gray-200 bg-white px-4 text-sm text-brand-gray sm:px-6"
    >
      {/* Home */}

      <Link to={menu.homePath} className="hover:text-brand-purple">
        Home
      </Link>

      {/* Section heading (for example, Review) */}

      {match && menu.showSectionInBreadcrumb && match.heading && (
        <>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{match.heading}</span>
        </>
      )}

      {/* Parent page (for example, Faculty Portfolio) */}

      {match && (
        <>
          <ChevronRight size={14} aria-hidden="true" />

          {subPage ? (
            <Link
              to={match.item.to}
          className="hover:text-brand-purple"
            >
              {match.item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-gray-900">
              {match.item.label}
            </span>
          )}
        </>
      )}

      {/* Current sub-page (for example, Research) */}

      {subPage && (
        <>
          <ChevronRight size={14} aria-hidden="true" />

          <span aria-current="page" className="text-gray-900">
            {subPage.label}
          </span>
        </>
      )}
    </nav>
  );
}

export default Breadcrumb;
