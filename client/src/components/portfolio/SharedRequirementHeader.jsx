import { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, ShieldCheck } from 'lucide-react';
import { usePortfolio } from '../../context/usePortfolio';

export default function SharedRequirementHeader({
  title,
  subtitle,
  onAddClick,
  addLabel = 'Add Document',
  backTo,
  onBack,
  embedded = false,
}) {
  const { selectedInstructor } = usePortfolio();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  // Decide from the URL, not from context
  const isAdmin = pathname.startsWith('/admin');

  const instructorId =
    searchParams.get('instructorId') ||
    selectedInstructor?._id ||
    selectedInstructor?.id;

  const [instructorInfo, setInstructorInfo] = useState(selectedInstructor || null);

  useEffect(() => {
    if (selectedInstructor) {
      setInstructorInfo(selectedInstructor);
    } else if (isAdmin && instructorId) {
      fetch(`http://localhost:5000/api/instructors/${instructorId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setInstructorInfo(data);
        })
        .catch(() => {});
    }
  }, [selectedInstructor, isAdmin, instructorId]);

  const backDestination = backTo || (isAdmin
    ? instructorId
      ? `/admin/review/faculty-portfolio?instructorId=${instructorId}`
      : '/admin/review/faculty-portfolio'
    : '/instructors/faculty-portfolio');
  

    
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Back button */}
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:opacity-70 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <Link
              to={backDestination}
              aria-label="Back"
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:opacity-70 transition"
            >
              <ArrowLeft size={16} />
            </Link>
          )}
          <div>
            <h1
              className={
                embedded
                  ? 'text-base sm:text-lg font-bold text-brand-purple tracking-tight'
                  : 'text-[23px] font-medium text-brand-purple'
              }
            >
              {title}
            </h1>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Action area: Faculty Add Button */}
        <div>
          {!isAdmin && onAddClick && (
            <button
              type="button"
              onClick={onAddClick}
              className="entry-add-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-purple hover:bg-opacity-90 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              {addLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
