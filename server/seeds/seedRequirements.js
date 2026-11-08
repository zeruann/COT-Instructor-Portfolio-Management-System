// Usage: node seeds/seedRequirements.js   (needs MONGODB_URI in the environment)
// Safe to run again: it upserts by key, so edits to the JSON file are applied.
const mongoose = require('mongoose');
const Requirement = require('../models/Requirement');
const faculty = require('./requirementsFaculty.json');
const classReqs = require('./requirementsClass.json');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  for (const r of faculty) {
    await Requirement.updateOne({ key: r.key }, { $set: r }, { upsert: true });
  }
  console.log(`Seeded ${faculty.length} faculty requirements`);

  for (const r of classReqs) {
    await Requirement.updateOne({ key: r.key }, { $set: r }, { upsert: true });
  }
  console.log(`Seeded ${classReqs.length} class requirements`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
