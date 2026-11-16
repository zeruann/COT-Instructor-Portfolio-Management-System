const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : (req.query.token || null);

  if (!token) return res.status(401).json({ message: 'Not authenticated.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, accountType, iat, exp }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
};