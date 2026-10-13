// client/src/context/usePortfolio.js
import { useContext } from 'react';
import { PortfolioContext } from './portfolioContextDef';

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  return (
    context || {
      isAdmin: false,
      targetInstructorId: null,
      selectedInstructor: null,
      selectInstructor: () => {},
    }
  );
}

export default usePortfolio;
