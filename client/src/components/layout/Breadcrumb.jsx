import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { NAV, findMenuItem, findSubPage } from '../../config/navigation';
import { fetchClassById } from '../../api/classes';

// The small "Home > Faculty Portfolio > Research" line under the top bar.

function Breadcrumb({ role }) {
  const { pathname } = useLocation();
  const [classLabel, setClassLabel] = useState(null);
  const [archivePeriodLabel, setArchivePeriodLabel] = useState(null);

  const menu = NAV[role];

  // Detect /admin/archive-records/:periodId
  const archiveMatch =
    role === 'admin'
      ? pathname.match(/^\/admin\/archive-records\/([^/]+)\/?$/)
      : null;
  const archivePeriodId = archiveMatch ? archiveMatch[1] : null;

  // Find the current sub-page independently of the sidebar menu item.
  const subPage = menu ? findSubPage(role, pathname) : null;

  // Resolve academic period label for archived period detail routes.
  useEffect(() => {
    let cancelled = false;

    async function loadArchivePeriodLabel() {
      if (!archivePeriodId) {
        setArchivePeriodLabel(null);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `http://localhost:5000/api/academic-periods/${archivePeriodId}/details`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (cancelled) return;
        const p = data?.period;
        if (p?.schoolYear) {
          const sem =
            p.semester === 'Summer'
              ? 'Summer Term'
              : p.semester
                ? `${p.semester} Semester`
                : '';
          setArchivePeriodLabel(`AY ${p.schoolYear}${sem ? ` ${sem}` : ''}`);
        } else {
          setArchivePeriodLabel(null);
        }
      } catch {
        if (!cancelled) setArchivePeriodLabel(null);
      }
    }

    loadArchivePeriodLabel();
    return () => {
      cancelled = true;
    };
  }, [archivePeriodId]);

  // Resolve a friendly class label for class-portfolio nested routes.
  useEffect(() => {
    let cancelled = false;

    async function loadClassLabel() {
      if (!subPage?.classId) {
        setClassLabel(null);
        return;
      }

      try {
        const data = await fetchClassById(subPage.classId);
        if (cancelled) return;
        const subjectCode = data?.class?.subject?.code;
        const sectionCode = data?.class?.section?.code || data?.class?.section?.name;
        if (subjectCode && sectionCode) {
          setClassLabel(`${subjectCode} · ${sectionCode}`);
        } else if (subjectCode) {
          setClassLabel(subjectCode);
        } else {
          setClassLabel(null);
        }
      } catch {
        if (!cancelled) setClassLabel(null);
      }
    }

    loadClassLabel();
    return () => {
      cancelled = true;
    };
  }, [subPage?.classId]);

  if (!menu) return null;

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

  // For class portfolio: Class Portfolio > Class > Requirement
  // For other sub-pages: Parent > Sub-page
  const isClassPortfolioNested = Boolean(subPage?.classId);
  const isRequirementPage = Boolean(subPage?.reqPath);
  const currentLabel = isRequirementPage
    ? subPage.label
    : (classLabel || subPage?.label);

  const crumbs = [];

  if (match && menu.showSectionInBreadcrumb && match.heading) {
    crumbs.push({ key: 'section', node: <span>{match.heading}</span> });
  }

  if (match) {
    const hasSubCrumb = Boolean(subPage || archivePeriodId);
    crumbs.push({
      key: 'parent',
      node: hasSubCrumb ? (
        <Link to={match.item.to} className="hover:text-brand-purple">
          {match.item.label}
        </Link>
      ) : (
        <span aria-current="page" className="text-gray-900">
          {match.item.label}
        </span>
      ),
    });
  }

  if (archivePeriodId) {
    crumbs.push({
      key: 'archive-period',
      node: (
        <span aria-current="page" className="text-gray-900">
          {archivePeriodLabel || 'Academic Period'}
        </span>
      ),
    });
  }

  if (isClassPortfolioNested) {
    crumbs.push({
      key: 'class',
      node: isRequirementPage ? (
        <Link
          to={`/instructors/class-portfolio/${subPage.classId}`}
          className="hover:text-brand-purple"
        >
          {classLabel || 'Class Details'}
        </Link>
      ) : (
        <span aria-current="page" className="text-gray-900">
          {classLabel || 'Class Details'}
        </span>
      ),
    });
  }

  if (subPage && !isClassPortfolioNested) {
    crumbs.push({
      key: 'subpage',
      node: (
        <span aria-current="page" className="text-gray-900">
          {subPage.label}
        </span>
      ),
    });
  }

  if (isRequirementPage) {
    crumbs.push({
      key: 'requirement',
      node: (
        <span aria-current="page" className="text-gray-900">
          {currentLabel}
        </span>
      ),
    });
  }

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-9 shrink-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-gray-200 bg-white px-4 text-sm text-brand-gray sm:px-6"
    >
      {crumbs.map((crumb, index) => (
        <span key={crumb.key} className="contents">
          {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
          {crumb.node}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumb;
