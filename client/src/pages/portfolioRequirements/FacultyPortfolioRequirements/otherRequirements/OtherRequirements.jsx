import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import SharedRequirementHeader from '../../../../components/portfolio/SharedRequirementHeader';
import { usePortfolio } from '../../../../context/usePortfolio';
import '../requirementStyle.css';
import '../listEntries.css';

// Parent page of the three tab pages. The router renders the active tab page inside <Outlet />.
const tabs = [
  { label: 'Professional Organization Membership', to: 'professional-organization-membership' },
  { label: 'Passed Licensure Examinations', to: 'passed-licensure-examinations' },
  { label: 'IPCR', to: 'ipcr' },
];

function OtherRequirements() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  // HOW THE "Add Document" BUTTON KNOWS WHICH TAB IS OPEN
  // The button does not know the tab. It only adds 1 to this counter.
  // Every tab page reads the counter through <Outlet context>, and the tab that is
  // open (the only one on screen) opens its OWN upload popup with its OWN requirement.
  const [addTrigger, setAddTrigger] = useState(0);

  return (
    <div className="space-y-5">
      {/* HEADER: back arrow + title (+ Admin review banner).
          The Add button is NOT drawn here anymore: it sits in the tabs row below. */}
      <SharedRequirementHeader
        title="Other Requirements"
        subtitle="Professional organizations, licensure examinations, and IPCR"
        onAddClick={null}
        addLabel="Add Document"
      />

      {/* TABS ROW: tabs on the left, Add button on the right.
          items-stretch makes the button exactly as tall as the tabs. */}
      <div className="flex flex-wrap items-stretch justify-between gap-3">
        {/* TABS: each one preserves query search params (like ?instructorId=...) */}
        <nav aria-label="Other requirements" className="max-w-full overflow-x-auto">
          <div className="inline-flex border border-gray-200 bg-white rounded-lg overflow-hidden">
            {tabs.map((tab) => {
              const targetTo = location.search ? `${tab.to}${location.search}` : tab.to;
              return (
                <NavLink
                  key={tab.to}
                  to={targetTo}
                  className={({ isActive }) =>
                    `whitespace-nowrap border-r border-gray-200 px-7 py-3.5 text-sm font-medium last:border-r-0 transition ${isActive ? 'bg-brand-purple text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* ADD BUTTON: instructors only. Uploads a file for whichever tab is open. */}
        {!isAdmin && (
          <button
            type="button"
            className="entry-add-btn"
            onClick={() => setAddTrigger((n) => n + 1)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Document
          </button>
        )}
      </div>

      {/* ACTIVE TAB PAGE (ProfessionalOrgs, PassedLicensureExams or IPCR) */}
      <Outlet context={{ addTrigger }} />
    </div>
  );
}

export default OtherRequirements;