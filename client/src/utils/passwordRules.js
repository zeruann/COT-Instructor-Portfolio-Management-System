export const PASSWORD_RULES = [
  { id: 'length',    label: 'At least 8 characters',   test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter',    test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter',    test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number',              test: (p) => /\d/.test(p) },
  { id: 'special',   label: 'One special character',   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isPasswordValid = (p) => PASSWORD_RULES.every((r) => r.test(p));