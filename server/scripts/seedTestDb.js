const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { TEST_DB_NAME, getTestMongoUri, clearTestCollections, signTestToken } = require('./testDbUri');
const Requirement = require('../models/Requirement');
const Setting = require('../models/Setting');
const Instructor = require('../models/Instructor');
const AcademicPeriod = require('../models/AcademicPeriod');
const ClassModel = require('../models/Class');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const facultyRequirements = require('../seeds/requirementsFaculty.json');
const classRequirements = require('../seeds/requirementsClass.json');

const TEST_PASSWORD = 'TestPass@123';

async function seedTestDb() {
  const testUri = getTestMongoUri();
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in server/.env');
  }

  await mongoose.connect(testUri);
  const connectedDb = mongoose.connection.db.databaseName;
  if (connectedDb !== TEST_DB_NAME) {
    await mongoose.disconnect();
    throw new Error(`Safety abort: connected to "${connectedDb}" instead of "${TEST_DB_NAME}".`);
  }

  console.log(`Connected to isolated test DB: ${connectedDb}`);
  await clearTestCollections(mongoose);
  console.log('Cleared previous test database state.');

  // 1. Requirements
  await Requirement.insertMany([...facultyRequirements, ...classRequirements]);

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiredDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  // 2. Test Accounts (Admins, Instructors, Invitations)
  const adminUser = await Instructor.create({
    fullName: 'Test Admin Account',
    email: 'admin.test@buksu.edu.ph',
    password: passwordHash,
    department: 'Information Technology',
    accountType: 'Administrator',
    accountStatus: 'Active',
    onlineStatus: 'Online',
    lastSeenAt: now,
    profile: {
      firstName: 'Test',
      lastName: 'Admin',
      gender: 'Prefer not to say',
      civilStatus: 'Single',
      contactNumber: '09171000001',
      address: 'Malaybalay City, Bukidnon',
      position: 'Dean',
      rank: 'Professor I',
    },
  });

  const instructorUser = await Instructor.create({
    fullName: 'Test Instructor Account',
    email: 'instructor.test@buksu.edu.ph',
    password: passwordHash,
    department: 'Information Technology',
    accountType: 'Instructor',
    accountStatus: 'Active',
    onlineStatus: 'Online',
    lastSeenAt: now,
    status: 'Accepted',
    invitedBy: adminUser.fullName,
    respondedAt: now,
    adminAccess: {
      enabled: true,
      scope: 'limited',
      pages: ['review_faculty'],
      documents: { faculty: ['FAC_A_PDS'], class: [] },
      invitedBy: adminUser._id,
      invitedByName: adminUser.fullName,
      grantedAt: now,
      updatedAt: now,
    },
    profile: {
      firstName: 'Test',
      lastName: 'Instructor',
      gender: 'Female',
      civilStatus: 'Single',
      contactNumber: '09171000002',
      address: 'Malaybalay City, Bukidnon',
      position: 'Faculty',
      rank: 'Instructor I',
      education: [
        {
          level: "Master's",
          degree: 'MS in Information Technology',
          school: 'Bukidnon State University',
          yearGraduated: 2022,
        },
      ],
    },
  });

  const regularInstructor = await Instructor.create({
    fullName: 'Regular Test Instructor',
    email: 'regular.test@buksu.edu.ph',
    password: passwordHash,
    department: 'Information Technology',
    accountType: 'Instructor',
    accountStatus: 'Active',
    onlineStatus: 'Offline',
    status: 'Accepted',
    invitedBy: adminUser.fullName,
    respondedAt: now,
    profile: {
      firstName: 'Regular',
      lastName: 'Instructor',
      contactNumber: '09171000003',
      position: 'Faculty',
      rank: 'Instructor I',
    },
  });

  const emptyProfileUser = await Instructor.create({
    fullName: 'Empty Profile User',
    email: 'emptyprofile.test@buksu.edu.ph',
    password: passwordHash,
    department: 'Information Technology',
    accountType: 'Instructor',
    accountStatus: 'Active',
    status: 'Accepted',
    invitedBy: adminUser.fullName,
    respondedAt: now,
    profile: {},
  });

  // Invitations stored in Instructor collection
  const pendingToken1 = crypto.randomBytes(32).toString('hex');
  const pendingToken2 = crypto.randomBytes(32).toString('hex');
  const expiredToken = crypto.randomBytes(32).toString('hex');

  const pendingInvite1 = await Instructor.create({
    fullName: 'Juan Pending One',
    email: 'pending1.test@buksu.edu.ph',
    department: 'Information Technology',
    accountType: 'Instructor',
    accountStatus: 'Pending',
    status: 'Pending',
    token: pendingToken1,
    invitedBy: adminUser.fullName,
    dateSent: now,
    expiresAt: in7Days,
    resendCount: 0,
  });

  const pendingInvite2 = await Instructor.create({
    fullName: 'Maria Pending Two',
    email: 'pending2.test@buksu.edu.ph',
    department: 'Information Technology',
    accountType: 'Instructor',
    accountStatus: 'Pending',
    status: 'Pending',
    token: pendingToken2,
    invitedBy: adminUser.fullName,
    dateSent: now,
    expiresAt: in7Days,
    resendCount: 0,
  });

  const expiredInvite = await Instructor.create({
    fullName: 'Pedro Expired Invite',
    email: 'expired.test@buksu.edu.ph',
    department: 'Automotive Technology',
    accountType: 'Instructor',
    accountStatus: 'Pending',
    status: 'Expired',
    token: expiredToken,
    invitedBy: adminUser.fullName,
    dateSent: expiredDate,
    expiresAt: expiredDate,
    resendCount: 0,
  });

  // 3. Settings (recaptchaEnabled: false so Thunder Client login works immediately)
  await Setting.insertMany([
    { key: 'recaptchaEnabled', value: false, updatedBy: adminUser._id },
    { key: 'googleAuthEnabled', value: true, updatedBy: adminUser._id },
    { key: 'googleDriveEnabled', value: true, updatedBy: adminUser._id },
    { key: 'googleMailEnabled', value: true, updatedBy: adminUser._id },
    { key: 'googleSheetsEnabled', value: true, updatedBy: adminUser._id },
  ]);

  // 4. Academic Periods
  const activePeriod = await AcademicPeriod.create({
    schoolYear: '2026-2027',
    semester: '1st',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-12-20'),
    status: 'Active',
    isCurrent: true,
    setBy: adminUser._id,
  });

  const upcomingPeriod = await AcademicPeriod.create({
    schoolYear: '2026-2027',
    semester: '2nd',
    startDate: new Date('2027-01-10'),
    endDate: new Date('2027-05-25'),
    status: 'Upcoming',
    isCurrent: false,
    setBy: adminUser._id,
  });

  // 5. Classes
  const activeClass = await ClassModel.create({
    ownerId: instructorUser._id,
    academicPeriodId: activePeriod._id,
    subject: { code: 'IT 345', name: 'Integrative Programming & Technologies 2' },
    section: { code: 'T1123', name: 'BSIT 3A' },
  });

  const archivedClass = await ClassModel.create({
    ownerId: instructorUser._id,
    academicPeriodId: activePeriod._id,
    subject: { code: 'IT 321', name: 'Web Systems and Technologies' },
    section: { code: 'T1124', name: 'BSIT 3B' },
    archivedAt: now,
  });

  // 6. Sample Documents
  const pendingDoc = await Document.create({
    requirementKey: 'FAC_B_BACHELORS_TOR',
    ownerId: instructorUser._id,
    slotKey: Document.buildSlotKey({
      ownerId: instructorUser._id,
      requirementKey: 'FAC_B_BACHELORS_TOR',
    }),
    meta: { title: "Bachelor's Transcript of Records (Test)" },
    status: 'pending_review',
    currentVersion: 1,
    submittedAt: now,
    versions: [
      {
        n: 1,
        driveFileId: 'test-drive-placeholder-pending',
        originalName: 'Test_Bachelors_TOR.pdf',
        mimeType: 'application/pdf',
        size: 102400,
        uploadedAt: now,
        uploadedBy: instructorUser._id,
      },
    ],
  });

  const approvedDoc = await Document.create({
    requirementKey: 'FAC_A_PDS',
    ownerId: instructorUser._id,
    slotKey: Document.buildSlotKey({
      ownerId: instructorUser._id,
      requirementKey: 'FAC_A_PDS',
    }),
    meta: { title: 'Updated PDS (Test Approved)' },
    status: 'approved',
    currentVersion: 1,
    submittedAt: now,
    reviewedAt: now,
    versions: [
      {
        n: 1,
        driveFileId: 'test-drive-placeholder-approved',
        originalName: 'Test_Updated_PDS.pdf',
        mimeType: 'application/pdf',
        size: 95000,
        uploadedAt: now,
        uploadedBy: instructorUser._id,
        review: {
          decision: 'approved',
          by: adminUser._id,
          at: now,
        },
      },
    ],
  });

  const pendingClassDoc = await Document.create({
    requirementKey: 'CLASS_B_CLASS_LIST',
    ownerId: instructorUser._id,
    classIds: [activeClass._id],
    academicPeriodId: activePeriod._id,
    slotKey: Document.buildSlotKey({
      ownerId: instructorUser._id,
      requirementKey: 'CLASS_B_CLASS_LIST',
      academicPeriodId: activePeriod._id,
      classIds: [activeClass._id],
    }),
    status: 'pending_review',
    currentVersion: 1,
    submittedAt: now,
    versions: [
      {
        n: 1,
        driveFileId: 'test-drive-placeholder-classlist',
        originalName: 'T1123 - IT 345 - Official Class list.pdf',
        mimeType: 'application/pdf',
        size: 84000,
        uploadedAt: now,
        uploadedBy: instructorUser._id,
      },
    ],
  });

  // 7. Notifications
  const [notif1, notif2] = await Notification.insertMany([
    {
      userId: instructorUser._id,
      type: 'document_approved',
      title: 'Document Approved',
      message: 'Your Updated PDS document was approved (Test Seed).',
      documentId: approvedDoc._id,
      requirementKey: 'FAC_A_PDS',
      senderId: adminUser._id,
      category: 'all',
      audience: 'instructor',
    },
    {
      userId: instructorUser._id,
      type: 'reminder',
      title: 'Portfolio Reminder',
      message: 'Please review remaining class portfolio items (Test Seed).',
      senderId: adminUser._id,
      category: 'system',
      audience: 'instructor',
    },
    {
      userId: adminUser._id,
      type: 'document_submitted',
      title: 'New Submission',
      message: 'Test Instructor Account submitted FAC_B_BACHELORS_TOR.',
      documentId: pendingDoc._id,
      requirementKey: 'FAC_B_BACHELORS_TOR',
      senderId: instructorUser._id,
      category: 'pending_review',
      audience: 'admin',
    },
  ]);

  // 8. Sample Audit Logs
  await AuditLog.insertMany([
    {
      actorId: adminUser._id,
      actorRole: 'Administrator',
      actorName: adminUser.fullName,
      category: 'period',
      action: 'ACADEMIC_PERIOD_CREATE',
      outcome: 'success',
      targetType: 'academicPeriod',
      targetId: activePeriod._id,
      targetLabel: '2026-2027 1st',
      details: 'Seeded test academic period',
    },
    {
      actorId: instructorUser._id,
      actorRole: 'Instructor',
      actorName: instructorUser.fullName,
      category: 'document',
      action: 'DOCUMENT_UPLOAD',
      outcome: 'success',
      targetType: 'document',
      targetId: pendingDoc._id,
      targetLabel: 'FAC_B_BACHELORS_TOR',
      documentName: 'FAC_B_BACHELORS_TOR',
      fileName: 'Test_Bachelors_TOR.pdf',
      details: 'Seeded test faculty document upload',
    },
  ]);

  const adminToken = signTestToken(adminUser, 'admin');
  const instructorToken = signTestToken(instructorUser, 'instructor');
  const regularToken = signTestToken(regularInstructor, 'instructor');
  const emptyProfileToken = signTestToken(emptyProfileUser, 'instructor');

  const summary = [
    '====================================================================',
    `ISOLATED TEST DATABASE READY: ${TEST_DB_NAME}`,
    'Real database ("cotportfolio") was NOT touched.',
    '====================================================================',
    '',
    'TEST ACCOUNTS (Password for all: TestPass@123)',
    `  Admin:            ${adminUser.email} (id: ${adminUser._id})`,
    `  Instructor:       ${instructorUser.email} (id: ${instructorUser._id}) [has limited adminAccess]`,
    `  Regular Instr.:   ${regularInstructor.email} (id: ${regularInstructor._id}) [adminAccess disabled]`,
    `  Empty Profile:    ${emptyProfileUser.email} (id: ${emptyProfileUser._id}) [for POST /api/profile/ 201]`,
    '',
    'BEARER TOKENS (valid 24h)',
    `  <ADMIN_TOKEN>=${adminToken}`,
    `  <INSTRUCTOR_TOKEN>=${instructorToken}`,
    `  <REGULAR_INSTRUCTOR_TOKEN>=${regularToken}`,
    `  <TOKEN_OF_USER_WITH_EMPTY_PROFILE>=${emptyProfileToken}`,
    '',
    'SEEDED RESOURCE IDs FOR THUNDER CLIENT',
    `  Active Period ID (2.6.3):         ${activePeriod._id}`,
    `  Upcoming Period ID:               ${upcomingPeriod._id}`,
    `  Active Class ID (2.5.2 / 2.5.3):  ${activeClass._id}`,
    `  Archived Class ID (2.5.4):        ${archivedClass._id}`,
    `  Pending Doc ID (2.4.3/2.4.5/2.17):${pendingDoc._id}`,
    `  Approved Doc ID (2.4.6-2 403):    ${approvedDoc._id}`,
    `  Pending Class Doc ID:             ${pendingClassDoc._id}`,
    `  Notification ID #1 (2.7.3):       ${notif1._id}`,
    `  Notification ID #2 (2.7.5):       ${notif2._id}`,
    '',
    'INVITATIONS (for 2.12.x and 2.16.x)',
    `  Pending Invite #1 Token (Accept/Setup 2.12.1,2,4): ${pendingToken1}`,
    `  Pending Invite #1 ID:                             ${pendingInvite1._id}`,
    `  Pending Invite #2 Token (Reject 2.12.3):          ${pendingToken2}`,
    `  Pending Invite #2 ID (Cancel 2.16.7):             ${pendingInvite2._id}`,
    `  Expired Invite ID (Resend 2.16.6):                ${expiredInvite._id}`,
    '',
    'NOTES:',
    '  - Start test server with: npm --prefix server run dev:test',
    '  - For 2.4.4 Stream Document File (200 OK), upload a real small PDF via',
    '    2.14.1 Upload Portfolio Document first, then use that returned document _id.',
    '  - Drop test database anytime with: npm --prefix server run drop:test',
    '====================================================================',
  ].join('\n');

  const outPath = path.resolve(__dirname, 'test-session-info.txt');
  fs.writeFileSync(outPath, summary + '\n', 'utf8');
  console.log(summary);
  console.log(`Saved reference sheet to: ${outPath}`);

  await mongoose.disconnect();
}

seedTestDb().catch(async (err) => {
  console.error('Failed to seed test DB:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

