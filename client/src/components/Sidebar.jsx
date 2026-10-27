import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import useLogout from '../hooks/useLogout';
import { NAV } from '../config/navigation';

// The seal shown next to the "COT FACULTY PORTFOLIO" text.
// Change this path when a new seal is added to the public folder.

const LOGO = '/COT-PurpleLogo.svg';

// The outline you see when moving through the menu with the keyboard.

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange';

// Orange pill for the page you are on, light gray text for the others.
// "short:" = a bit tighter on screens that are not tall, so the menu fits without scrolling.

function linkClass({ isActive }) {
  const base = `flex items-center gap-3 rounded-lg px-3 py-2.5 py-1.5 text-sm font-regular transition-colors ${focusRing}`;

  if (isActive) return `${base} bg-brand-orange text-white shadow-md shadow-orange-200 font-medium`;

  return `${base} text-brand-muted hover:bg-gray-100 hover:text-brand-purple font-regular`;
}

// Smaller, indented version of linkClass used for the items inside a dropdown.

function childLinkClass({ isActive }) {
  const base = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${focusRing}`;

  if (isActive) return `${base} bg-brand-orange text-white shadow-md shadow-orange-200 font-medium`;

  return `${base} text-brand-muted hover:bg-gray-100 hover:text-brand-purple font-regular`;
}

// The Logout button at the bottom of the sidebar.

function SidebarLogout({ role }) {
  const { askToLogout, logoutModal } = useLogout(role);

  return (
    <div className="shrink-0 border-t border-gray-200 p-4">
      <button
        type="button"
        onClick={askToLogout}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-gray transition-colors hover:bg-red-50 hover:text-red-600 ${focusRing}`}
      >
        <LogOut size={18} aria-hidden="true" />
        Logout
      </button>
      {logoutModal}
    </div>
  );
}

// A menu item that opens and closes a list of links (a dropdown).
// The parent stays highlighted while one of its pages is open.

function SidebarGroup({ item, isOpen, isActive, onToggle, onClose, isChildActive }) {
  const { label, icon: Icon, children } = item;
  const panelId = `nav-group-${label.toLowerCase().replace(/\s+/g, '-')}`;

  // Text looks the same as the other menu items (normal weight, muted color), active or not.
  // When one of its pages is open, only a light background shows it.

  const buttonClass = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-normal text-brand-muted transition-colors hover:bg-gray-100 hover:text-brand-purple ${focusRing} ${isActive ? 'bg-orange-50' : ''
    }`;

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={buttonClass}
      >
        <Icon size={18} aria-hidden="true" />
        <span className="flex-1 text-left font-normal">{label}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul id={panelId} className="mt-1 ml-5 flex flex-col gap-1 border-l border-gray-200 pl-3">
          {children.map((child) => (
            <li key={child.to}>
              <NavLink
                to={child.to}
                onClick={onClose}
                end
                className={({ isActive: linkActive }) =>
                  childLinkClass({ isActive: linkActive || isChildActive(child.to) })
                }
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// On a big screen the sidebar sits on the left of the page.
// On a phone or tablet it is hidden, and opens on top of the page when `isOpen` is true.

function Sidebar({ role, isOpen, onClose }) {
  const location = useLocation();
  const menu = NAV[role];

  // Which dropdowns are open, by label. Example: { Instructors: true }

  const [openGroups, setOpenGroups] = useState({});

  // Pressing Escape closes the menu.

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeOnEscape);

    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  // Checks whether a page belongs to a parent portfolio sidebar item.

  function isParentPortfolioActive(to) {
    const pathname = location.pathname;

    // Instructor Faculty Portfolio and its shared requirement pages.

    if (role === 'instructor' && to === '/instructors/faculty-portfolio') {
      return pathname === to ||
        pathname.startsWith('/instructors/portfolio/faculty-portfolio/');
    }

    // Administrator Faculty Portfolio and its shared requirement pages.

    if (role === 'admin' && to === '/admin/review/faculty-portfolio') {
      return pathname === to ||
        pathname.startsWith('/admin/portfolio/faculty-portfolio/');
    }

    // Instructor Class Portfolio and its nested pages.

    if (role === 'instructor' && to === '/instructors/class-portfolio') {
      return pathname === to ||
        pathname.startsWith('/instructors/class-portfolio/');
    }

    // Administrator Class Portfolio and its nested pages.

    if (role === 'admin' && to === '/admin/review/class-portfolio') {
      return pathname === to ||
        pathname.startsWith('/admin/review/class-portfolio/');
    }

    return false;
  }

  // True when the current page is one of the dropdown's pages.

  function isGroupActive(item) {
    return item.children.some(
      (child) => location.pathname === child.to || isParentPortfolioActive(child.to),
    );
  }

  // When you land on a page inside a dropdown, open that dropdown.

  useEffect(() => {
    if (!menu) return;

    const toOpen = {};

    menu.sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children && isGroupActive(item)) toOpen[item.label] = true;
      });
    });

    if (Object.keys(toOpen).length > 0) {
      setOpenGroups((current) => ({ ...current, ...toOpen }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, role]);

  function toggleGroup(label) {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  }

  if (!menu) return null; // unknown role: show nothing

  return (
    <>
      {/* Dark background behind the open menu (phones and tablets). Click it to close. */}

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-gray-200 bg-white lg:static lg:flex lg:w-64 lg:shrink-0 ${isOpen ? 'flex' : 'hidden'
          }`}
      >
        {/* Logo. Same height as the top bar (h-header), so the two bottom lines line up. */}

        <div className="relative flex h-header shrink-0 items-center justify-center border-b border-gray-200 px-4">
          <img
            src={LOGO}
            alt="BukSU seal"
            className="w-12 shrink-0 object-contain"
          />

          <div className="ml-3 text-lg leading-tight text-brand-purple">
            <p>
              <span className="font-bold">COT</span>{' '}
              <span className="font-medium italic">FACULTY</span>
            </p>
            <p className="font-medium tracking-wide">PORTFOLIO</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={`absolute right-3 top-3 rounded-lg p-1.5 text-brand-gray hover:bg-gray-50 hover:text-brand-purple lg:hidden ${focusRing}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu. The scrollbar is hidden. The menu is small enough to fit, and still scrolls on very short screens. */}

        <nav aria-label="Main menu" className="no-scrollbar flex-1 overflow-y-auto">
          {menu.sections.map((section, index) => (
            <div
              key={section.heading}
              className={`px-4 py-5 short:py-3 ${index > 0 ? 'border-t border-gray-200' : ''}`}
            >
              <h2 className="mb-3 short:mb-2 px-3 text-sm font-semibold uppercase tracking-wide text-brand-gray">
                {section.heading}
              </h2>

              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  // Dropdown item: has a list of pages inside it.

                  if (item.children) {
                    return (
                      <li key={item.label}>
                        <SidebarGroup
                          item={item}
                          isOpen={Boolean(openGroups[item.label])}
                          isActive={isGroupActive(item)}
                          onToggle={() => toggleGroup(item.label)}
                          onClose={onClose}
                          isChildActive={isParentPortfolioActive}
                        />
                      </li>
                    );
                  }

                  // Normal item: a single link.

                  const { to, label, icon: Icon } = item;

                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={onClose}
                        end
                        className={({ isActive }) =>
                          linkClass({
                            isActive: isActive || isParentPortfolioActive(to),
                          })
                        }
                      >
                        <Icon size={18} aria-hidden="true" />
                        {label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <SidebarLogout role={role} />
      </aside>
    </>
  );
}

export default Sidebar;