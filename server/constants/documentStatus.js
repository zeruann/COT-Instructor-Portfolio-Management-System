// One place for every document status rule. Do not hard-code statuses elsewhere.
// "Missing" is never stored: it means no document exists for a requirement.

const STATUS = Object.freeze({
    DRAFT: 'draft',
    PENDING_REVIEW: 'pending_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  });
  
  // from -> allowed next statuses
  const TRANSITIONS = Object.freeze({
    [STATUS.DRAFT]: [STATUS.PENDING_REVIEW],
    [STATUS.PENDING_REVIEW]: [STATUS.APPROVED, STATUS.REJECTED],
    [STATUS.REJECTED]: [STATUS.PENDING_REVIEW], // re-upload
    [STATUS.APPROVED]: [STATUS.PENDING_REVIEW], // replaced by the instructor (confirm with client)
  });
  
  // Who may trigger a transition
  const REVIEWER_TARGETS = [STATUS.APPROVED, STATUS.REJECTED];
  
  function canTransition(from, to) {
    return (TRANSITIONS[from] || []).includes(to);
  }
  
  function assertTransition(from, to) {
    if (!canTransition(from, to)) {
      throw new Error(`Invalid status change: ${from} -> ${to}`);
    }
  }
  
  module.exports = { STATUS, TRANSITIONS, REVIEWER_TARGETS, canTransition, assertTransition };
  