import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// A blank page that shows only its title. Replace the page file's content when the real page is built.
// Pass backTo (a path) to show a round back arrow in front of the title.
function PlaceholderPage({ title, backTo }) {
  useEffect(() => {
    document.title = `${title} | COT Faculty Portfolio`;
  }, [title]);

  const heading = (
    <h1 className="text-[24px] leading-[32px] font-medium text-brand-purple">
      {title}
    </h1>
  );
  if (!backTo) return heading;

  return (
    <div className="flex items-center gap-3">
      <Link
        to={backTo}
        aria-label="Back"
        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:opacity-70"
      >
        <ArrowLeft size={16} />
      </Link>
      {heading}
    </div>
  );
}

export default PlaceholderPage;