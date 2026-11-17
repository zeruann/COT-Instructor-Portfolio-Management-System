/**
 * Safe Pre-Testing Database Reset Script
 *
 * Preserves:
 *   - All Instructor & Administrator accounts (Instructor collection)
 *   - All Requirement definitions (Requirement collection)
 *   - All System/API Settings (Setting collection)
 *   - All Invitations (Invitation collection)
 *   - Google Drive files (untouched)
 *
 * Clears:
 *   - Uploaded test documents (Document collection)
 *   - Test classes (Class collection)
 *   - Test activity logs (AuditLog collection)
 *   - Test notifications (Notification collection)
 *   - Extra dummy academic periods, leaving exactly 1 Active period
 *
 * Usage:
 *   1) Preview (safe dry-run, makes NO changes):
 *      node scripts/resetForFormalTesting.js
 *
 *   2) Execute reset with 1 active academic period:
 *      node scripts/resetForFormalTesting.js --confirm --schoolYear=2026-2027 --semester=1st
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

const Instructor = require('../models/Instructor');
const Requirement = require('../models/Requirement');
const Setting = require('../models/Setting');
const Invitation = require('../models/Invitation');
const AcademicPeriod = require('../models/AcademicPeriod');
const Document = require('../models/Document');
const Class = require('../models/Class');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

function parseArgs(argv) {
  const args = {
    confirm: false,
    schoolYear: '2026-2027',
    semester: '1st',
  };

  for (const arg of argv) {
    if (arg === '--confirm') args.confirm = true;
    else if (arg.startsWith('--schoolYear=')) args.schoolYear = arg.split('=')[1].trim();
    else if (arg.startsWith('--semester=')) args.semester = arg.split('=')[1].trim();
  }

  return args;
}

async function main() {
  const { confirm, schoolYear, semester } = parseArgs(process.argv.slice(2));

  if (!/^\d{4}-\d{4}$/.test(schoolYear)) {
    console.error(`Invalid --schoolYear "${schoolYear}". Expected format: YYYY-YYYY (e.g. 2026-2027).`);
    process.exit(1);
  }
  if (!['1st', '2nd', 'Summer'].includes(semester)) {
    console.error(`Invalid --semester "${semester}". Expected: 1st, 2nd, or Summer.`);
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in server/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const [
      instructorCount,
      adminCount,
      requirementCount,
      settingCount,
      invitationCount,
      docCount,
      classCount,
      auditCount,
      notifCount,
      periods,
    ] = await Promise.all([
      Instructor.countDocuments({ accountType: 'Instructor' }),
      Instructor.countDocuments({ accountType: 'Administrator' }),
      Requirement.countDocuments(),
      Setting.countDocuments(),
      Invitation.countDocuments(),
      Document.countDocuments(),
      Class.countDocuments(),
      AuditLog.countDocuments(),
      Notification.countDocuments(),
      AcademicPeriod.find().sort({ createdAt: 1 }).lean(),
    ]);

    const targetPeriod = periods.find(
      (p) => p.schoolYear === schoolYear && p.semester === semester
    );
    const periodsToDelete = periods.filter(
      (p) => !(p.schoolYear === schoolYear && p.semester === semester)
    );

    console.log('\n============================================================');
    console.log(confirm ? '  EXECUTING FORMAL TESTING RESET' : '  DRY RUN PREVIEW (NO CHANGES WILL BE MADE)');
    console.log('============================================================\n');

    console.log('PRESERVED (untouched):');
    console.log(`  - Instructors:   ${instructorCount}`);
    console.log(`  - Admins:        ${adminCount}`);
    console.log(`  - Requirements:  ${requirementCount}`);
    console.log(`  - Settings:      ${settingCount}`);
    console.log(`  - Invitations:   ${invitationCount}`);

    console.log('\nWILL BE CLEARED:');
    console.log(`  - Documents:     ${docCount}`);
    console.log(`  - Classes:       ${classCount}`);
    console.log(`  - Audit Logs:    ${auditCount}`);
    console.log(`  - Notifications: ${notifCount}`);
    console.log(`  - Extra Periods: ${periodsToDelete.length}`);
    if (periodsToDelete.length > 0) {
      periodsToDelete.forEach((p) => {
        console.log(`      • AY ${p.schoolYear} (${p.semester}) [${p.status}]`);
      });
    }

    console.log('\nACTIVE PERIOD AFTER RESET:');
    console.log(
      `  - AY ${schoolYear} (${semester}) — ${targetPeriod ? 'existing record will be set Active' : 'new Active record will be created'}`
    );

    if (!confirm) {
      console.log('\nTo apply these changes, run:');
      console.log(`  node scripts/resetForFormalTesting.js --confirm --schoolYear=${schoolYear} --semester=${semester}\n`);
      return;
    }

    const [docRes, classRes, auditRes, notifRes] = await Promise.all([
      Document.deleteMany({}),
      Class.deleteMany({}),
      AuditLog.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // Remove all periods except the target period (if it exists)
    if (targetPeriod) {
      await AcademicPeriod.deleteMany({ _id: { $ne: targetPeriod._id } });
      await AcademicPeriod.updateOne(
        { _id: targetPeriod._id },
        {
          $set: {
            status: 'Active',
            isCurrent: true,
            isArchived: false,
            archivedAt: null,
            closedAt: null,
          },
        }
      );
    } else {
      await AcademicPeriod.deleteMany({});
      const [startYr] = schoolYear.split('-').map(Number);
      await AcademicPeriod.create({
        schoolYear,
        semester,
        startDate: new Date(`${startYr}-08-01T00:00:00.000Z`),
        endDate: new Date(`${startYr}-12-20T23:59:59.000Z`),
        status: 'Active',
        isCurrent: true,
        isArchived: false,
      });
    }

    console.log('\nRESET COMPLETE:');
    console.log(`  - Deleted Documents:     ${docRes.deletedCount}`);
    console.log(`  - Deleted Classes:       ${classRes.deletedCount}`);
    console.log(`  - Deleted Audit Logs:    ${auditRes.deletedCount}`);
    console.log(`  - Deleted Notifications: ${notifRes.deletedCount}`);
    console.log(`  - Active Period:         AY ${schoolYear} (${semester})\n`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Reset script failed:', err);
  process.exit(1);
});

