import { PASSWORD_RULES } from '../utils/passwordRules';

function PasswordChecklist({ password }) {
  return (
    <ul className="mt-3 space-y-1.5" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-sm transition-colors ${
              ok ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span className="flex w-4 h-4 shrink-0 items-center justify-center">
              {ok ? (
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5l4 4 8-9" />
                </svg>
              ) : (
                <span className="w-2 h-2 rounded-full border border-current" />
              )}
            </span>
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default PasswordChecklist;