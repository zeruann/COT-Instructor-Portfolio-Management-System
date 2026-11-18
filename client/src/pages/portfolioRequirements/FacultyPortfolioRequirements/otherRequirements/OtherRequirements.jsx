import { useState } from 'react';
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import SharedRequirementHeader from '../../../../components/portfolio/SharedRequirementHeader';
import { usePortfolio } from '../../../../context/usePortfolio';
import ProfessionalOrgs from './ProfessionalOrgs';
import PassedLicensureExams from './PassedLicensureExams';
import IPCR from './IPCR';
import '../requirementStyle.css';
import '../listEntries.css';

// Parent page of the three tab pages. The router renders the active tab page inside <Outlet />.
const tabs = [
  { label: 'Professional Organization Membership', to: 'professional-organization-membership' },
  { label: 'Passed Licensure Examinations', to: 'passed-licensure-examinations' },
  { label: 'IPCR', to: 'ipcr' },
];

function OtherRequirements({ embedded = false, onBack } = {}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedInstructor, targetInstructorId } = usePortfolio();
  const isAdmin = location.pathname.startsWith('/admin');
  const instructorId =
    searchParams.get('instructorId') ||
    targetInstructorId ||
    selectedInstructor?._id ||
    selectedInstructor?.id ||
    null;

  // HOW THE "Add Document" BUTTON KNOWS WHICH TAB IS OPEN
  // The button does not know the tab. It only adds 1 to this counter.
  // Every tab page reads the counter through <Outlet context>, and the tab that is
  // open (the only one on screen) opens its OWN upload popup with its OWN requirement.
  const [addTrigger, setAddTrigger] = useState(0);
  const [embeddedTab, setEmbeddedTab] = useState('professional-organization-membership');

  const query = instructorId ? `?instructorId=${instructorId}` : location.search;

  return (
    <div className="space-y-5">
      {/* HEADER: back arrow + title (+ Admin review banner).
          The Add button is NOT drawn here anymore: it sits in the tabs row below. */}
      <SharedRequirementHeader
        title="Other Requirements"
        subtitle="Professional organizations, licensure examinations, and IPCR"
        onAddClick={null}
        addLabel="Add Document"
        onBack={onBack}
        embedded={embedded}
      />

      {/* TABS ROW: tabs on the left, Add button on the right.
          items-stretch makes the button exactly as tall as the tabs. */}
      <div className="flex flex-wrap items-stretch justify-between gap-3">
        {/* TABS: each one preserves query search params (like ?instructorId=...) */}
        <nav aria-label="Other requirements" className="max-w-full overflow-x-auto">
          <div className="inline-flex border border-gray-200 bg-white rounded-lg overflow-hidden">
            {tabs.map((tab) => {
              if (embedded) {
                const isActive = embeddedTab === tab.to;
                return (
                  <button
                    key={tab.to}
                    type="button"
                    onClick={() => setEmbeddedTab(tab.to)}
                    className={`whitespace-nowrap border-r border-gray-200 px-7 py-3.5 text-sm font-medium last:border-r-0 transition cursor-pointer ${isActive ? 'bg-brand-purple text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    {tab.label}
                  </button>
                );
              }

              const targetTo = query ? `${tab.to}${query}` : tab.to;
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
      </div>

      {/* ACTIVE TAB PAGE (ProfessionalOrgs, PassedLicensureExams or IPCR) */}
      {embedded ? (
        embeddedTab === 'professional-organization-membership' ? (
          <ProfessionalOrgs />
        ) : embeddedTab === 'passed-licensure-examinations' ? (
          <PassedLicensureExams />
        ) : (
          <IPCR />
        )
      ) : (
        <Outlet context={{ addTrigger, instructorId }} />
      )}
    </div>
  );
}

export function StandaloneOtherRequirement({
  title,
  subtitle,
  Component,
  embedded = false,
  onBack,
}) {
  return (
    <div className="space-y-5">
      <SharedRequirementHeader
        title={title}
        subtitle={subtitle}
        onAddClick={null}
        onBack={onBack}
        embedded={embedded}
      />
      <Component />
    </div>
  );
}

export function StandaloneProfessionalOrgs(props) {
  return (
    <StandaloneOtherRequirement
      title="Professional Organization Membership"
      subtitle="Upload proof of membership in your professional organizations"
      addLabel="Add Membership"
      Component={ProfessionalOrgs}
      {...props}
    />
  );
}

export function StandalonePassedLicensureExams(props) {
  return (
    <StandaloneOtherRequirement
      title="Passed Licensure Examinations"
      subtitle="Upload sample copies of your PRC ID or licensure examination certificates"
      addLabel="Add Licensure"
      Component={PassedLicensureExams}
      {...props}
    />
  );
}

export function StandaloneIPCR(props) {
  return (
    <StandaloneOtherRequirement
      title="IPCR"
      subtitle="Upload photocopy of IPCR from 1st and 2nd semester of the current school year"
      addLabel="Add IPCR"
      Component={IPCR}
      {...props}
    />
  );
}

export default OtherRequirements;