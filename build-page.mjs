#!/usr/bin/env node
// fallaccount · build-page.mjs — inline the GATED accounting kernel (accounts.mjs) verbatim into
// index.html, between /*__KERNEL_START__*/ and /*__KERNEL_END__*/. The only transform is stripping
// the ES-module `export` keywords and exposing the API on window.FA_ACCOUNTS — the maths is byte-for-
// byte the witness-gated source. CI runs this and git-diffs the result: if index.html's kernel drifts
// from accounts.mjs, the build is dirty and the gate goes red. The live tax maths cannot silently
// diverge from the proven tax maths.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const kernelSrc = readFileSync(join(here, 'accounts.mjs'), 'utf8');
const htmlPath = join(here, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

// verbatim except: drop `export ` prefixes and the trailing `export default` line
const stripped = kernelSrc
  .replace(/^export default .*$/m, '')
  .replace(/^export /gm, '');

if (/<\/script/i.test(stripped)) {
  console.error('REFUSED: the kernel contains a literal </script — it cannot be inlined safely.');
  process.exit(1);
}

const block = `/*__KERNEL_START__*/
(function(){
${stripped.trim()}
window.FA_ACCOUNTS = { RATES_2025_26, validTxn, ledger, vatReturn, soleTraderTax, vatThresholdCheck };
})();
/*__KERNEL_END__*/`;

const re = /\/\*__KERNEL_START__\*\/[\s\S]*?\/\*__KERNEL_END__\*\//;
if (!re.test(html)) { console.error('REFUSED: kernel markers not found in index.html.'); process.exit(1); }

const next = html.replace(re, block);
if (next === html && process.argv.includes('--check')) {
  // --check: no change means already in sync (only true if identical) — handled by the diff in CI
}
writeFileSync(htmlPath, next);
console.log(`inlined ${(stripped.length / 1024).toFixed(1)}KB of gated kernel into index.html`);
