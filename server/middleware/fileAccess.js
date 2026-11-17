// server/middleware/fileAccess.js
//
// Auth for GET /api/documents/:id/file.
// Accepts EITHER a file ticket (?ticket=...) tied to one document + version,
// OR a normal login token (Authorization header or ?token=...) via the regular auth middleware.
const auth = require('./auth');
const fileTicket = require('../utils/fileTicket');

module.exports = (req, res, next) => {
  const ticket = req.query.ticket;
  if (!ticket) return auth(req, res, next);

  try {
    const p = fileTicket.verify(ticket);

    // Ticket is only valid for the exact document and version it was issued for
    if (p.docId !== req.params.id || Number(req.query.version) !== p.v) {
      return res.status(403).json({ message: 'Invalid file link.' });
    }

    req.user = { id: p.id, accountType: p.accountType };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'File link expired.' });
  }
};
