import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

// Same rules as the old .eslintrc.json ("next/core-web-vitals"), in the
// flat config format Next.js 16 / ESLint 9 require.
export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
