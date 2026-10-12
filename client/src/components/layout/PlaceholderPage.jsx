import { useEffect } from 'react';

// A blank page that shows only its title. Replace the page file's content when the real page is built.
function PlaceholderPage({ title }) {
  useEffect(() => {
    document.title = `${title} | COT Faculty Portfolio`;
  }, [title]);

  return <h1 className="text-2xl font-medium text-brand-purple">{title}</h1>;
}

export default PlaceholderPage;
