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
          <Link
            to={backDestination}
            aria-label="Back"
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:opacity-70 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-[23px] font-medium text-brand-purple">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Action area: Admin Review Badge OR Faculty Add Button */}
        <div>
          {isAdmin ? (
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-brand-purple" />
              <span>
                Review Mode:{' '}
                <strong className="font-semibold text-brand-purple">
                  {instructorInfo?.fullName || 'Instructor Portfolio'}
                </strong>
                {instructorInfo?.department && (
                  <span className="text-gray-500 ml-1">
                    ({instructorInfo.department})
                  </span>
                )}
              </span>
            </div>
          ) : (
            onAddClick && (
              <button
                type="button"
                onClick={onAddClick}
                className="entry-add-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-purple hover:bg-opacity-90 rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                {addLabel}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
