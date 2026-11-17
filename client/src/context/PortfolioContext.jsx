// client/src/context/PortfolioContext.jsx
import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { PortfolioContext } from './portfolioContextDef';
import { API_BASE } from '../api/config';

export function PortfolioProvider({ children }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = location.pathname.startsWith('/admin');
  const queryInstructorId = searchParams.get('instructorId');

  const [selectedInstructor, setSelectedInstructor] = useState(null);

  // If Admin and instructorId is in the URL, fetch instructor info
  useEffect(() => {
    let isMounted = true;

    if (isAdmin && queryInstructorId) {
      fetch(`${API_BASE}/instructors/${queryInstructorId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Instructor not found');
          return res.json();
        })
        .then((data) => {
          if (isMounted) setSelectedInstructor(data);
        })
        .catch((err) => {
          console.error('Failed to load instructor for portfolio review:', err);
          if (isMounted) setSelectedInstructor(null);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isAdmin, queryInstructorId]);

  const selectInstructor = (instructor) => {
    setSelectedInstructor(instructor);
    if (instructor?._id || instructor?.id) {
      searchParams.set('instructorId', instructor._id || instructor.id);
      setSearchParams(searchParams, { replace: true });
    }
  };

  const activeInstructor = queryInstructorId ? selectedInstructor : null;

  return (
    <PortfolioContext.Provider
      value={{
        isAdmin,
        targetInstructorId: queryInstructorId,
        selectedInstructor: activeInstructor,
        selectInstructor,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}
