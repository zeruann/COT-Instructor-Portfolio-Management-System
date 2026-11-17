#!/usr/bin/env node
// client/migrate-pages.mjs  (ONE-TIME helper, delete it after use)
//
// Removes the old <Sidebar /> + <Header /> wrapper from six existing pages so they show
// inside the new shared layout (AppLayout) instead of drawing their own.
//
// Run from the client folder:
//   node migrate-pages.mjs --dry-run     <- shows what it WOULD do, changes nothing
//   node migrate-pages.mjs               <- does it
//
// Safe by design: it changes nothing unless EVERY check on EVERY file passes. Your page
// content and line endings are kept as they are. Review with `git diff`; undo one file
// with `git restore <file>`.
//
// IMPORTANT: use it together with the new App.jsx. Without it, the migrated pages
// would show with no sidebar or top bar.
import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const SRC = path.join(process.cwd(), 'src');

// ---- the old wrapper, as it exists in your pages ----
const ADMIN_OPEN =
  /<div className="flex">\s*<Sidebar role="admin" \/>\s*<div className="flex-1 bg-\[#F8F9FB\] min-h-screen p-8">\s*<Header role="admin" \/>/g;
const INSTRUCTOR_OPEN =
  /<div className="flex h-screen bg-gray-50">\s*<Sidebar role="instructor" \/>\s*<div className="flex-1 flex flex-col min-w-0">\s*<Header role="instructor" user=\{instructor\} \/>\s*<main className="flex-1 overflow-y-auto p-8">/g;

// ---- how each kind of wrapper ends (kept as functions so line endings can be matched) ----
const KINDS = {
  // the last two </div> before the end of a return(...)
  admin: {
    open: ADMIN_OPEN,
    close: /<\/div>\s*<\/div>\s*\);/g,
    closeWith: (eol) => `${eol}    </>${eol}  );`,
    removed: { div: 2, main: 0 },
  },
  // same, but the <AppModal /> sits between the two closing divs
  invite: {
    open: ADMIN_OPEN,
    close: /<\/div>\s*(<AppModal modal=\{modal\} onClose=\{close\} \/>)\s*<\/div>\s*\);/g,
    closeWith: (eol, _m, modal) => `${eol}      ${modal}${eol}    </>${eol}  );`,
    removed: { div: 2, main: 0 },
  },
  // </main></div></div>
  instructor: {
    open: INSTRUCTOR_OPEN,
    close: /<\/main>\s*<\/div>\s*<\/div>\s*\);/g,
    closeWith: (eol) => `${eol}    </>${eol}  );`,
    removed: { div: 2, main: 1 },
  },
};

const PLANS = [
  { file: 'pages/admin/AdminDashboard.jsx', kind: 'admin', blocks: 1 },
  { file: 'pages/admin/AdminInstructorProfile.jsx', kind: 'admin', blocks: 3 },
  { file: 'pages/admin/InviteInstructor.jsx', kind: 'invite', blocks: 1 },
  { file: 'pages/admin/ViewInstructors.jsx', kind: 'admin', blocks: 1 },
  { file: 'pages/instructors/dashboard.jsx', kind: 'instructor', blocks: 1 },
  // Profile also tells the top bar when the name changes
  { file: 'pages/instructors/Profile.jsx', kind: 'instructor', blocks: 1, refreshEvent: true },
];

const IMPORTS = /^[ \t]*import\s+(?:Sidebar|Header)\s+from\s+['"][^'"]+['"];?[ \t]*\r?\n/gm;
const count = (text, re) => (text.match(re) || []).length;
const TAGS = { divOpen: /<div[\s>]/g, divClose: /<\/div>/g, mainOpen: /<main[\s>]/g, mainClose: /<\/main>/g };

function plan(entry) {
  const full = path.join(SRC, entry.file);
  if (!fs.existsSync(full)) return { entry, status: 'problem', why: 'file not found' };
  const before = fs.readFileSync(full, 'utf8');
  if (!/<Sidebar\b|<Header\b/.test(before)) return { entry, status: 'skip', why: 'already migrated' };

  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const kind = KINDS[entry.kind];
  const problems = [];

  const opens = count(before, kind.open);
  const closes = count(before, kind.close);
  const imports = count(before, IMPORTS);
  if (opens !== entry.blocks) problems.push(`expected ${entry.blocks} old wrapper(s) at the top, found ${opens}`);
  if (closes !== entry.blocks) problems.push(`expected ${entry.blocks} wrapper ending(s), found ${closes}`);
  if (imports !== 2) problems.push(`expected the 2 imports of Sidebar and Header, found ${imports}`);
  if (problems.length) return { entry, status: 'problem', why: problems.join('; ') };

  let after = before
    .replace(kind.open, '<>')
    .replace(kind.close, (...m) => kind.closeWith(eol, ...m))
    .replace(IMPORTS, '');

  let eventAdded = false;
  if (entry.refreshEvent) {
    const anchor = /(\r?\n)([ \t]*)setSaveSuccess\("Profile updated successfully\."\);/g;
    if (count(after, anchor) === 1) {
      after = after.replace(anchor, (_m, nl, indent) =>
        `${nl}${indent}window.dispatchEvent(new Event("instructor-updated"));${nl}${indent}setSaveSuccess("Profile updated successfully.");`);
      eventAdded = true;
    }
  }

  // self-checks on the result
  if (/<Sidebar\b|<Header\b/.test(after)) problems.push('a <Sidebar> or <Header> is still in the file');
  const delta = (re, now, was) => count(now, re) - count(was, re);
  if (delta(TAGS.divOpen, after, before) !== -kind.removed.div * entry.blocks) problems.push('<div> count is off');
  if (delta(TAGS.divClose, after, before) !== -kind.removed.div * entry.blocks) problems.push('</div> count is off');
  if (delta(TAGS.mainOpen, after, before) !== -kind.removed.main * entry.blocks) problems.push('<main> count is off');
  if (delta(TAGS.mainClose, after, before) !== -kind.removed.main * entry.blocks) problems.push('</main> count is off');
  if (count(after, /<>/g) - count(before, /<>/g) !== entry.blocks) problems.push('fragment count is off');
  if (count(after, /<\/>/g) - count(before, /<\/>/g) !== entry.blocks) problems.push('fragment end count is off');
  if (problems.length) return { entry, status: 'problem', why: problems.join('; ') };

  return { entry, status: 'ok', full, after, eventAdded };
}

if (!fs.existsSync(path.join(SRC, 'pages'))) {
  console.error('Run this from the client folder (the one that contains src/pages).');
  process.exit(1);
}

const results = PLANS.map(plan);
for (const r of results) {
  const note = r.status === 'ok' ? `will unwrap${r.eventAdded ? ' + add the name-refresh line' : ''}` : r.why;
  console.log(`${r.status === 'ok' ? 'OK     ' : r.status === 'skip' ? 'SKIP   ' : 'PROBLEM'}  ${r.entry.file}  (${note})`);
  if (r.entry.refreshEvent && r.status === 'ok' && !r.eventAdded) {
    console.log('         note: could not find the "Profile updated successfully." line. By hand, add  window.dispatchEvent(new Event("instructor-updated"));  just before it.');
  }
}

if (results.some((r) => r.status === 'problem')) {
  console.error('\nNothing was changed, because at least one file did not look as expected.');
  console.error('Send me the PROBLEM line(s) above (or the file itself) and I will adjust.');
  process.exit(1);
}
if (DRY_RUN) {
  console.log('\nDry run only: nothing was changed. Run again without --dry-run to apply.');
  process.exit(0);
}
for (const r of results) if (r.status === 'ok') fs.writeFileSync(r.full, r.after);
console.log(`\nDone: ${results.filter((r) => r.status === 'ok').length} file(s) updated. Next: git diff, then npm run dev.`);
