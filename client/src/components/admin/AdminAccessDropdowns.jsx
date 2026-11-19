// client/src/components/admin/AdminAccessDropdowns.jsx
import { useState } from 'react';
import { ChevronDown, ShieldCheck, SlidersHorizontal, Check } from 'lucide-react';
import {
  ADMIN_PAGES,
  FACULTY_DOCUMENT_PERMISSIONS,
  CLASS_DOCUMENT_PERMISSIONS,
} from '../../config/adminPermissions';

function BrandCheckbox({ checked, onChange }) {
  return (
    <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 items-center justify-center rounded border transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[#2e2a72]/30 peer-focus-visible:ring-offset-1 ${checked
          ? 'border-[#2e2a72] bg-[#2e2a72] text-white shadow-2xs'
          : 'border-gray-300 bg-white text-transparent group-hover:border-[#2e2a72]/60'
          }`}
      >
        <Check size={11} strokeWidth={3} className="text-white" />
      </span>
    </span>
  );
}

function CheckboxRow({ checked, onChange, label, sublabel }) {
  return (
    <label className="group flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#efeef8]/60 transition-colors cursor-pointer select-none">
      <BrandCheckbox checked={checked} onChange={onChange} />
      <div className="min-w-0">
        <span
          className={`block text-sm leading-snug transition-colors ${checked ? 'font-semibold text-[#2e2a72]' : 'font-medium text-gray-800'
            }`}
        >
          {label}
        </span>
        {sublabel && <span className="block text-xs text-gray-400">{sublabel}</span>}
      </div>
    </label>
  );
}

/**
 * Two smooth, animated dropdowns for selecting Instructor-Admin access:
 *   1. Full Administrator access
 *   2. Limited access (Admin Pages + Documents grouped by Faculty Portfolio and Class)
 */
export default function AdminAccessDropdowns({ value, onChange }) {
  const access = value || {
    enabled: false,
    scope: 'none',
    pages: [],
    documents: { faculty: [], class: [] },
  };

  const [fullOpen, setFullOpen] = useState(access.scope === 'full');
  const [limitedOpen, setLimitedOpen] = useState(access.scope === 'limited');

  const isFull = access.enabled && access.scope === 'full';
  const isLimited = access.enabled && access.scope === 'limited';

  // Keep Limited selections cleanly isolated from Full scope
  const selectedPages = isLimited ? access.pages || [] : [];
  const selectedFaculty = isLimited ? access.documents?.faculty || [] : [];
  const selectedClass = isLimited ? access.documents?.class || [] : [];

  const allPageKeys = ADMIN_PAGES.map((p) => p.key);
  const allFacultyKeys = FACULTY_DOCUMENT_PERMISSIONS.map((d) => d.key);
  const allClassKeys = CLASS_DOCUMENT_PERMISSIONS.map((d) => d.key);

  const isAllSelected =
    isLimited &&
    allPageKeys.every((k) => selectedPages.includes(k)) &&
    allFacultyKeys.every((k) => selectedFaculty.includes(k)) &&
    allClassKeys.every((k) => selectedClass.includes(k));

  const setFullAccess = (checked) => {
    if (checked) {
      onChange({
        enabled: true,
        scope: 'full',
        pages: allPageKeys,
        documents: { faculty: allFacultyKeys, class: allClassKeys },
      });
      setLimitedOpen(false);
    } else {
      onChange({
        enabled: false,
        scope: 'none',
        pages: [],
        documents: { faculty: [], class: [] },
      });
    }
  };

  const emitLimited = (nextPages, nextFaculty, nextClass) => {
    const hasAny = nextPages.length > 0 || nextFaculty.length > 0 || nextClass.length > 0;
    onChange({
      enabled: hasAny,
      scope: hasAny ? 'limited' : 'none',
      pages: hasAny ? nextPages : [],
      documents: {
        faculty: hasAny ? nextFaculty : [],
        class: hasAny ? nextClass : [],
      },
    });
  };

  const toggleSelectAllLimited = () => {
    if (isAllSelected) {
      emitLimited([], [], []);
    } else {
      emitLimited(allPageKeys, allFacultyKeys, allClassKeys);
    }
  };

  const togglePage = (key) => {
    const next = selectedPages.includes(key)
      ? selectedPages.filter((k) => k !== key)
      : [...selectedPages, key];
    emitLimited(next, selectedFaculty, selectedClass);
  };

  const toggleFacultyGroup = () => {
    const allChecked = allFacultyKeys.every((k) => selectedFaculty.includes(k));
    const nextFac = allChecked ? [] : allFacultyKeys;
    const nextPages =
      !allChecked && !selectedPages.includes('review_faculty')
        ? [...selectedPages, 'review_faculty']
        : selectedPages;
    emitLimited(nextPages, nextFac, selectedClass);
  };

  const toggleFacultyDoc = (key) => {
    const adding = !selectedFaculty.includes(key);
    const nextFac = adding
      ? [...selectedFaculty, key]
      : selectedFaculty.filter((k) => k !== key);
    const nextPages =
      adding && !selectedPages.includes('review_faculty')
        ? [...selectedPages, 'review_faculty']
        : selectedPages;
    emitLimited(nextPages, nextFac, selectedClass);
  };

  const toggleClassGroup = () => {
    const allChecked = allClassKeys.every((k) => selectedClass.includes(k));
    const nextClass = allChecked ? [] : allClassKeys;
    const nextPages =
      !allChecked && !selectedPages.includes('review_class')
        ? [...selectedPages, 'review_class']
        : selectedPages;
    emitLimited(nextPages, selectedFaculty, nextClass);
  };

  const toggleClassDoc = (key) => {
    const adding = !selectedClass.includes(key);
    const nextClass = adding
      ? [...selectedClass, key]
      : selectedClass.filter((k) => k !== key);
    const nextPages =
      adding && !selectedPages.includes('review_class')
        ? [...selectedPages, 'review_class']
        : selectedPages;
    emitLimited(nextPages, selectedFaculty, nextClass);
  };

  const totalDocs = selectedFaculty.length + selectedClass.length;
  const limitedSummary = `${selectedPages.length} ${selectedPages.length === 1 ? 'page' : 'pages'} • ${totalDocs} ${totalDocs === 1 ? 'doc' : 'docs'}`;

  return (
    <div className="space-y-4">
      {/* Dropdown 1: Full Administrator Access */}
      <div
        className={`rounded-2xl border transition-colors ${isFull ? 'border-[#2e2a72]/40 bg-[#efeef8]/40' : 'border-gray-200 bg-white'
          }`}
      >
        <button
          type="button"
          onClick={() => setFullOpen((prev) => !prev)}
          aria-expanded={fullOpen}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${isFull ? 'bg-[#2e2a72] text-white' : 'bg-[#efeef8] text-[#2e2a72]'
                }`}
            >
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#2e2a72]">Full Administrator Access</p>
              <p className="text-xs text-gray-500 truncate">
                Grants access to the exact same pages and documents as the Administrator.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isFull && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#efeef8] border border-[#2e2a72]/20 px-2.5 py-0.5 text-xs font-semibold text-[#2e2a72]">
                <Check size={12} strokeWidth={2.5} /> Enabled
              </span>
            )}
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-300 ${fullOpen ? 'rotate-180' : ''
                }`}
            />
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${fullOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-gray-100 px-5 py-4">
              <label className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5 hover:border-[#2e2a72]/40 transition-colors cursor-pointer select-none">
                <BrandCheckbox
                  checked={isFull}
                  onChange={(e) => setFullAccess(e.target.checked)}
                />
                <div>
                  <span className="block text-sm font-semibold text-[#2e2a72]">
                    Grant Full Administrator Access
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    The instructor will be able to switch to Administrator mode and access all
                    management pages, portfolio reviews, reports, archives, academic periods,
                    activity logs, and settings.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown 2: Limited Access */}
      <div
        className={`rounded-2xl border transition-colors ${isLimited ? 'border-[#2e2a72]/40 bg-[#efeef8]/30' : 'border-gray-200 bg-white'
          }`}
      >
        <button
          type="button"
          onClick={() => setLimitedOpen((prev) => !prev)}
          aria-expanded={limitedOpen}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${isLimited ? 'bg-[#2e2a72] text-white' : 'bg-[#efeef8] text-[#2e2a72]'
                }`}
            >
              <SlidersHorizontal size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#2e2a72]">Limited Access</p>
              <p className="text-xs text-gray-500 truncate">
                Select specific admin pages and Faculty / Class Portfolio documents to enable.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isLimited && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#efeef8] border border-[#2e2a72]/20 px-2.5 py-0.5 text-xs font-semibold text-[#2e2a72]">
                {limitedSummary}
              </span>
            )}
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-300 ${limitedOpen ? 'rotate-180' : ''
                }`}
            />
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${limitedOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-gray-100 px-5 py-4 space-y-5">
              {/* Global Select All */}
              <div className="flex items-center justify-between rounded-xl bg-[#f8f8fc] px-4 py-2.5 border border-[#2e2a72]/15">
                <label className="group flex items-center gap-2.5 cursor-pointer select-none">
                  <BrandCheckbox checked={isAllSelected} onChange={toggleSelectAllLimited} />
                  <span className="text-sm font-semibold text-[#2e2a72]">Select All</span>
                </label>
                <span className="text-xs text-gray-400">
                  Pages without access will remain locked
                </span>
              </div>

              {/* Admin Pages */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2e2a72]/80 mb-2">
                  Administrator Pages
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl border border-gray-200/80 bg-white p-2.5">
                  {ADMIN_PAGES.map((page) => (
                    <CheckboxRow
                      key={page.key}
                      checked={selectedPages.includes(page.key)}
                      onChange={() => togglePage(page.key)}
                      label={page.label}
                    />
                  ))}
                </div>
              </div>

              {/* Documents grouped by Requirement Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Faculty Portfolio Group */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#2e2a72]">
                      Faculty Portfolio Review
                    </h4>
                    <button
                      type="button"
                      onClick={toggleFacultyGroup}
                      className="text-xs font-semibold text-[#2e2a72] hover:text-[#433da3] hover:underline cursor-pointer"
                    >
                      {allFacultyKeys.every((k) => selectedFaculty.includes(k))
                        ? 'Unselect All'
                        : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                    {FACULTY_DOCUMENT_PERMISSIONS.map((doc) => (
                      <CheckboxRow
                        key={doc.key}
                        checked={selectedFaculty.includes(doc.key)}
                        onChange={() => toggleFacultyDoc(doc.key)}
                        label={doc.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Class Portfolio Group */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#2e2a72]">
                      Class Portfolio Review
                    </h4>
                    <button
                      type="button"
                      onClick={toggleClassGroup}
                      className="text-xs font-semibold text-[#2e2a72] hover:text-[#433da3] hover:underline cursor-pointer"
                    >
                      {allClassKeys.every((k) => selectedClass.includes(k))
                        ? 'Unselect All'
                        : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                    {CLASS_DOCUMENT_PERMISSIONS.map((doc) => (
                      <CheckboxRow
                        key={doc.key}
                        checked={selectedClass.includes(doc.key)}
                        onChange={() => toggleClassDoc(doc.key)}
                        label={doc.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
