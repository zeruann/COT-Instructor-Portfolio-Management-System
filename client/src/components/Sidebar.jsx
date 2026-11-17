import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import useLogout from '../hooks/useLogout';
import { NAV } from '../config/navigation';

// The seal shown next to the "COT FACULTY PORTFOLIO" text.
const LOGO = '/COT-PurpleLogo.svg';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange';

function linkClass({ isActive }, isCollapsed) {
  const base = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-regular transition-all ${focusRing}`;

  if (isActive) {
    return `${base} bg-brand-orange text-white shadow-md shadow-orange-200 font-medium ${isCollapsed ? 'justify-start lg:justify-center px-3 lg:px-2' : ''
      }`;
  }

  return `${base} text-brand-muted hover:bg-gray-100 hover:text-brand-purple font-regular ${isCollapsed ? 'justify-start lg:justify-center px-3 lg:px-2' : ''
    }`;
}

function childLinkClass({ isActive }) {
  const base = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${focusRing}`;

  if (isActive) return `${base} bg-brand-orange text-white shadow-md shadow-orange-200 font-medium`;

  return `${base} text-brand-muted hover:bg-gray-100 hover:text-brand-purple font-regular`;
}

function SidebarLogout({ role, isCollapsed }) {
  const { askToLogout, logoutModal } = useLogout(role);

  return (
    <div className="shrink-0 border-t border-gray-200 p-3 sm:p-4">
      <button
        type="button"
        onClick={askToLogout}
        title={isCollapsed ? 'Logout' : undefined}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-gray transition-colors hover:bg-red-50 hover:text-red-600 ${focusRing} ${isCollapsed ? 'justify-start lg:justify-center px-3 lg:px-2' : ''
          }`}
      >
        <LogOut size={18} aria-hidden="true" />
        <span className={isCollapsed ? 'inline lg:hidden' : ''}>Logout</span>
      </button>
      {logoutModal}
    </div>
  );
}

function SidebarGroup({ item, isOpen, isActive, onToggle, onClose, isChildActive, isCollapsed }) {
  const { label, icon: Icon, children } = item;
  const panelId = `nav-group-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const buttonClass = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-normal text-brand-muted transition-colors hover:bg-gray-100 hover:text-brand-purple ${focusRing} ${isActive ? 'bg-orange-50' : ''
    } ${isCollapsed ? 'justify-start lg:justify-center px-3 lg:px-2' : ''}`;

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        title={isCollapsed ? label : undefined}
        className={buttonClass}
      >
        <Icon size={18} aria-hidden="true" />
        <span className={`flex-1 text-left font-normal ${isCollapsed ? 'inline lg:hidden' : ''}`}>{label}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`text-brand-gray transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isCollapsed ? 'inline lg:hidden' : ''
            }`}
        />
      </button>

      {/* Normal expanded dropdown */}
      {isOpen && (
        <ul id={panelId} className={`mt-1 flex flex-col gap-1 pl-6 ${isCollapsed ? 'flex lg:hidden' : ''}`}>
          {children.map((child) => (
            <li key={child.to}>
              <NavLink
                to={child.to}
                onClick={onClose}
                end
                className={({ isActive: childIsActive }) =>
                  childLinkClass({
                    isActive: childIsActive || isChildActive(child.to),
                  })
                }
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}

      {/* Flyout dropdown when sidebar is collapsed on desktop */}
      {isCollapsed && (
        <div className="absolute left-full top-0 ml-2 hidden w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-xl lg:group-hover:block z-50">
          <div className="px-3 py-1.5 font-semibold text-xs text-brand-purple border-b border-gray-100 mb-1">
            {label}
          </div>
          <ul className="flex flex-col gap-1">
            {children.map((child) => (
              <li key={child.to}>
                <NavLink
                  to={child.to}
                  onClick={onClose}
                  end
                  className={({ isActive: childIsActive }) =>
                    childLinkClass({
                      isActive: childIsActive || isChildActive(child.to),
                    })
                  }
                >
                  {child.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Sidebar({ role, isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});
  const menu = NAV[role];

  const pathname = location.pathname;

  const isParentPortfolioActive = (linkTo) => {
    // Instructor Faculty Portfolio and its requirement pages
    if (role === 'instructor' && linkTo === '/instructors/faculty-portfolio') {
      return (
        pathname === linkTo ||
        pathname.startsWith('/instructors/portfolio/faculty-portfolio/')
      );
    }

    // Instructor Class Portfolio and its nested classes/requirements
    if (role === 'instructor' && linkTo === '/instructors/class-portfolio') {
      return (
        pathname === linkTo ||
        pathname.startsWith('/instructors/class-portfolio/')
      );
    }

    // Admin Faculty Portfolio and its requirement review pages
    if (role === 'admin' && linkTo === '/admin/review/faculty-portfolio') {
      return (
        pathname === linkTo ||
        pathname.startsWith('/admin/portfolio/faculty-portfolio/') ||
        pathname.startsWith('/admin/faculty-portfolio/')
      );
    }

    // Admin Class Portfolio and its nested classes/requirements review
    if (role === 'admin' && linkTo === '/admin/review/class-portfolio') {
      return (
        pathname === linkTo ||
        pathname.startsWith('/admin/review/class-portfolio/') ||
        pathname.startsWith('/admin/class-portfolio/')
      );
    }

    // Admin Archive Records and its selected academic period detail pages
    if (role === 'admin' && linkTo === '/admin/archive-records') {
      return (
        pathname === linkTo ||
        pathname.startsWith('/admin/archive-records/')
      );
    }

    return false;
  };

  const isGroupActive = (item) => {
    if (!item.children) return false;
    return item.children.some(
      (child) =>
        location.pathname === child.to ||
        location.pathname.startsWith(`${child.to}/`) ||
        isParentPortfolioActive(child.to)
    );
  };

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
  }, [location.pathname, role]);

  function toggleGroup(label) {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  }

  if (!menu) return null;

  return (
    <>
      {/* Dark background on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out lg:static lg:flex lg:shrink-0 ${isOpen ? 'flex w-72' : 'hidden'
          } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Header Branding */}
        <div className="relative flex h-header shrink-0 items-center justify-center border-b border-gray-200 px-3 overflow-hidden">
          <img
            src={LOGO}
            alt="BukSU seal"
            className="w-10 sm:w-11 shrink-0 object-contain transition-all"
          />

          {!isCollapsed ? (
            <div className="ml-3 text-lg leading-tight text-brand-purple min-w-0 transition-opacity duration-200">
              <p>
                <span className="font-bold">COT</span>{' '}
                <span className="font-medium italic">FACULTY</span>
              </p>
              <p className="font-medium tracking-wide">PORTFOLIO</p>
            </div>
          ) : (
            <div className="ml-3 text-lg leading-tight text-brand-purple min-w-0 transition-opacity duration-200 flex flex-col lg:hidden">
              <p>
                <span className="font-bold">COT</span>{' '}
                <span className="font-medium italic">FACULTY</span>
              </p>
              <p className="font-medium tracking-wide">PORTFOLIO</p>
            </div>
          )}

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={`absolute right-3 top-3 rounded-lg p-1.5 text-brand-gray hover:bg-gray-50 hover:text-brand-purple lg:hidden ${focusRing}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu Navigation */}
        <nav aria-label="Main menu" className="no-scrollbar flex-1 overflow-y-auto px-2 py-4">
          {menu.sections.map((section, index) => (
            <div
              key={section.heading}
              className={`py-3 ${index > 0 ? 'border-t border-gray-100' : ''}`}
            >
              {!isCollapsed ? (
                <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-brand-gray truncate">
                  {section.heading}
                </h2>
              ) : (
                <>
                  <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-brand-gray truncate lg:hidden">
                    {section.heading}
                  </h2>
                  <div className="hidden lg:block h-1 mb-2 border-b border-gray-100" />
                </>
              )}

              <ul className="flex flex-col gap-1">
                {section.items
                  .filter((item) => !item.hidden)
                  .map((item) => {
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
                            isCollapsed={isCollapsed}
                          />
                        </li>
                      );
                    }

                    const { to, label, icon: Icon } = item;

                    return (
                      <li key={to}>
                        <NavLink
                          to={to}
                          onClick={onClose}
                          end
                          title={isCollapsed ? label : undefined}
                          className={({ isActive }) =>
                            linkClass(
                              {
                                isActive: isActive || isParentPortfolioActive(to),
                              },
                              isCollapsed
                            )
                          }
                        >
                          <Icon size={18} className="shrink-0" aria-hidden="true" />
                          <span className={`truncate ${isCollapsed ? 'inline lg:hidden' : ''}`}>{label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>

        <SidebarLogout role={role} isCollapsed={isCollapsed} />
      </aside>
    </>
  );
}

export default Sidebar;