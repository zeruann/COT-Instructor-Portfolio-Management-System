// server/utils/fileTicket.js
//
// Short-lived "ticket" that lets the browser (iframe / img / download link) load ONE
// specific document version from /api/documents/:id/file without sending the login token.
// Signed with a different secret from login JWTs, so a ticket can never be used to log in.
const jwt = require('jsonwebtoken');

const TICKET_TTL = '10m';

const secret = () => process.env.FILE_TICKET_SECRET || `${process.env.JWT_SECRET}:file-ticket`;

exports.sign = ({ userId, accountType, docId, version }) =>
  jwt.sign(
    { id: userId, accountType, docId: String(docId), v: Number(version) },
    secret(),
    { expiresIn: TICKET_TTL }
  );

exports.verify = (token) => jwt.verify(token, secret());
