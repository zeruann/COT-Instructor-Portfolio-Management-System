const jwt = require('jsonwebtoken');

// Different secret from login JWTs, so a ticket can never act as a login token
const secret = () => process.env.FILE_TICKET_SECRET || `${process.env.JWT_SECRET}:file-ticket`;

exports.sign = ({ userId, accountType, docId, version }) =>
    jwt.sign({ id: userId, accountType, docId: String(docId), v: version }, secret(), { expiresIn: '10m' });

exports.verify = (token) => jwt.verify(token, secret());