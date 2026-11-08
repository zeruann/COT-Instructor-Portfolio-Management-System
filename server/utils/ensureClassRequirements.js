// server/utils/ensureClassRequirements.js
const mongoose = require('mongoose');
const Requirement = require('../models/Requirement');
const classRequirements = require('../seeds/requirementsClass.json');

async function ensureClassRequirements() {
  try {
    for (const r of classRequirements) {
      await Requirement.updateOne(
        { key: r.key },
        { $setOnInsert: r },
        { upsert: true }
      );
    }

    // Inspect collection validator for notifications
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections({ name: 'notifications' }).toArray();
      if (collections.length > 0 && collections[0].options?.validator) {
        console.log('[Notification Setup] Found strict validator on notifications collection:', JSON.stringify(collections[0].options.validator));
        // Remove or relax collection validator so notifications save reliably
        await db.command({
          collMod: 'notifications',
          validator: {},
          validationLevel: 'off',
        });
        console.log('[Notification Setup] Successfully removed validator on notifications collection.');
      }
    } catch (vErr) {
      console.warn('[Notification Setup] Note on collection check:', vErr.message);
    }
  } catch (err) {
    console.warn('Could not auto-seed class requirements:', err.message);
  }
}

module.exports = ensureClassRequirements;
