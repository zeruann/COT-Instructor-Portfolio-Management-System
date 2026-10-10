// Usage: node seeds/seedRequirements.js   (needs MONGODB_URI in the environment)
// Safe to run again: it upserts by key, so edits to the JSON file are applied.
const mongoose = require('mongoose');
const Requirement = require('../models/Requirement');
const faculty = require('./requirements.faculty.json');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const r of faculty) {
    await Requirement.updateOne({ key: r.key }, { $set: r }, { upsert: true });
  }
  console.log(`Seeded ${faculty.length} faculty requirements`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
