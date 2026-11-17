import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import {
  PRIVACY_NOTICE_VERSION,
  PRIVACY_NOTICE_EFFECTIVE_DATE,
  PRIVACY_ORGANIZATION,
  PRIVACY_DPO_EMAIL,
  PRIVACY_ADDRESS,
} from '../config/privacyNotice';

const sections = [
  {
    id: 'about',
    title: '1. About this notice',
    body: (
      <>
        <p>
          {PRIVACY_ORGANIZATION} (“BukSU COT”, “we”, “us”) operates the COT Instructor
          E-Portfolio Management System. This notice explains what personal data we collect from
          instructors, why we collect it, who can access it, and the rights you have under the{' '}
          <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and its implementing
          rules.
        </p>
        <p>
          It applies to instructors who are invited to the system and to all data entered during
          onboarding and throughout your use of your faculty and class portfolios.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: '2. What we collect',
    body: (
      <>
        <ul>
          <li>
            <strong>Account and invitation details</strong> — full name, institutional email,
            department, who invited you, invitation status and timestamps, and your account type.
            Passwords are stored only as irreversible hashes.
          </li>
          <li>
            <strong>Profile details</strong> — first, middle, and last name, gender, civil status,
            birthdate, contact number, alternate email, address, position or rank, and education
            history (degree, school, year graduated).
          </li>
          <li>
            <strong>Portfolio records</strong> — documents you upload (for example TOR, service
            records, certificates, research, and extension records), their review status, reviewer
            comments, and the classes or load assigned to you.
          </li>
          <li>
            <strong>Technical and audit data</strong> — sign-in time, IP address and browser
            information recorded in audit logs, and the actions you perform in the system.
          </li>
          <li>
            <strong>Google account data (only if you use Google Sign-In)</strong> — your verified
            email address, Google account identifier, and profile photo.
          </li>
        </ul>
        <p>
          Please upload only documents that you are authorized to share. Do not submit another
          person’s personal data without their consent.
        </p>
      </>
    ),
  },
  {
    id: 'why',
    title: '3. Why we collect it',
    body: (
      <>
        <ul>
          <li>Create and administer your instructor account.</li>
          <li>Build and maintain your faculty e-portfolio and class portfolios.</li>
          <li>Review and verify the requirements you submit.</li>
          <li>Generate compliance reports and summaries for the College.</li>
          <li>Protect the system through access controls and audit logs.</li>
        </ul>
        <p>
          <strong>Legal basis.</strong> We process your data based on your consent, given when you
          accept the system invitation, and on the University’s legitimate exercise of its functions
          as a public higher-education institution under Section 12 of RA 10173. We do not use your
          data for marketing and we do not make decisions about you through automated processing
          alone.
        </p>
      </>
    ),
  },
  {
    id: 'access',
    title: '4. Who can access your data',
    body: (
      <>
        <ul>
          <li>
            <strong>You</strong> — your own profile, portfolio, and classes.
          </li>
          <li>
            <strong>College administrators and assigned reviewers</strong> — instructors’ profiles
            and submitted documents that they are tasked to review.
          </li>
          <li>
            <strong>System administrators</strong> — account, settings, and audit-log access needed
            to operate the system.
          </li>
          <li>
            <strong>Service providers acting as processors</strong> — Google Workspace (Drive and
            Sheets) for storage and report generation, and our email provider for invitations and
            verification codes. They process data only on our instructions.
          </li>
        </ul>
        <p>
          We do not sell, rent, or publish your personal data. We disclose it to third parties only
          when required by law, a competent authority, or to protect the rights and safety of the
          University community.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: '5. How long we keep it',
    body: (
      <>
        <ul>
          <li>Active accounts are kept while you are connected to the College and your portfolio is in use.</li>
          <li>Archived portfolios are retained under the University’s records-retention rules.</li>
          <li>Invitation records, including declined or expired invitations, are kept for audit purposes.</li>
          <li>Audit logs are retained for the period required for security and accountability.</li>
        </ul>
        <p>
          When retention ends, data is securely deleted or anonymized. Requests for deletion are
          honored unless the University is required by law or policy to keep the record.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: '6. How we protect your data',
    body: (
      <p>
        Access is role-based: instructors, reviewers, and administrators see only what their role
        allows. We hash passwords, serve the system over HTTPS, expire invitation and reset tokens,
        record sensitive actions in audit logs, and restrict access to system settings and
        credentials. No system is completely secure, so please report any concern to the Data
        Protection Officer using the contact details below.
      </p>
    ),
  },
  {
    id: 'rights',
    title: '7. Your rights',
    body: (
      <>
        <p>Under RA 10173 you have the right to:</p>
        <ul>
          <li>be informed that your data is being processed and why;</li>
          <li>object to processing, including for direct marketing (we do none);</li>
          <li>access the personal data we hold about you;</li>
          <li>correct inaccurate or outdated entries;</li>
          <li>request deletion or blocking of your data;</li>
          <li>claim damages for violations of your rights; and</li>
          <li>file a complaint with the National Privacy Commission.</li>
        </ul>
        <p>
          To exercise these rights, email the Data Protection Officer at{' '}
          <a href={`mailto:${PRIVACY_DPO_EMAIL}`}>{PRIVACY_DPO_EMAIL}</a>. We may ask you to verify
          your identity, and we will respond within the period required by NPC regulations. Some
          requests may be limited by the University’s legal and records-retention obligations.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: '8. Cookies and local storage',
    body: (
      <p>
        The system keeps your sign-in session in your browser’s local storage so you do not have to
        log in on every page. It does not use advertising cookies or third-party trackers. Signing
        out clears the stored session; you can also clear it from your browser settings at any time.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '9. Changes to this notice',
    body: (
      <p>
        We may update this notice to reflect changes in the system or in the law. Each version is
        dated and numbered. Material changes are announced on the login page and this page, and a
        new version will be presented again for acknowledgement the next time you sign in.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '10. Contact us',
    body: (
      <>
        <p>
          <strong>Data Protection Officer</strong>
          <br />
          {PRIVACY_ORGANIZATION}
          <br />
          {PRIVACY_ADDRESS}
          <br />
          Email: <a href={`mailto:${PRIVACY_DPO_EMAIL}`}>{PRIVACY_DPO_EMAIL}</a>
        </p>
        <p>
          You may also raise concerns with the National Privacy Commission through its official
          channels.
        </p>
      </>
    ),
  },
];

function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-[#fbfbfb] font-sans text-gray-800">
      {/* Top bar */}
      <header className="border-b border-orange-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple transition hover:text-brand-orange"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <ShieldCheck size={15} className="text-brand-orange" />
            Privacy Notice v{PRIVACY_NOTICE_VERSION}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-8">
          <span className="inline-flex items-center rounded-full border border-orange-200/70 bg-orange-100 px-3 py-1 text-xs font-semibold text-brand-orange">
            Data Privacy Act of 2012 · RA 10173
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-purple sm:text-4xl">
            Privacy Notice
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
            How the COT Instructor E-Portfolio Management System collects, uses, and protects your
            personal data.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Version {PRIVACY_NOTICE_VERSION} · Effective {PRIVACY_NOTICE_EFFECTIVE_DATE}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          {/* Contents */}
          <nav aria-label="Contents" className="mb-6 lg:mb-0">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs lg:sticky lg:top-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Contents
              </p>
              <ul className="space-y-1.5 text-xs">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-md px-1.5 py-1 text-gray-600 transition hover:bg-orange-50 hover:text-brand-orange"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Body */}
          <article className="space-y-4">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs sm:p-6"
              >
                <h2 className="mb-3 text-base font-bold text-brand-purple sm:text-lg">
                  {section.title}
                </h2>
                <div className="privacy-prose space-y-3 text-sm leading-relaxed text-gray-600">
                  {section.body}
                </div>
              </section>
            ))}

            <p className="px-1 pt-2 text-xs text-gray-400">
              This notice is provided for transparency and does not replace the University’s
              official privacy policies or the text of RA 10173 and its implementing rules.
            </p>
          </article>
        </div>
      </main>
    </div>
  );
}

export default PrivacyNotice;
