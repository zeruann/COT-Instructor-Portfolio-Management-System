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
  const { isAdmin } = usePortfolio();
  const [addTrigger, setAddTrigger] = useState(0);

  return (
    <div className="space-y-5">
      {/* HEADER: back arrow + title, role-aware Add button or Admin review banner */}
      <SharedRequirementHeader
        title="Other Requirements"
        subtitle="Professional organizations, licensure examinations, and IPCR"
        onAddClick={!isAdmin ? () => setAddTrigger((n) => n + 1) : null}
        addLabel="Add Document"
      />

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
                  `whitespace-nowrap border-r border-gray-200 px-7 py-3.5 text-sm font-medium last:border-r-0 transition ${
                    isActive ? 'bg-brand-purple text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ACTIVE TAB PAGE (ProfessionalOrgs, PassedLicensureExams or IPCR) */}
      <Outlet context={{ addTrigger, triggerAdd: () => setAddTrigger((n) => n + 1) }} />
    </div>
  );
}

export default OtherRequirements;