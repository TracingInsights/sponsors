#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SHARED_DIR = 'node_modules/sponsorkit/dist/shared'

/**
 * Postinstall script to patch sponsorkit with includePrivate support.
 * This replaces the version-pinned pnpm patch with a flexible pattern-based approach
 * that survives dependabot version bumps.
 */

function findMjsFile(dir) {
  const files = readdirSync(dir)
  const mjsFile = files.find(f => f.endsWith('.mjs') && f.startsWith('sponsorkit.'))
  if (!mjsFile) {
    throw new Error(`Could not find sponsorkit.*.mjs in ${dir}. Found: ${files.join(', ')}`)
  }
  return join(dir, mjsFile)
}

function applyPatch() {
  const filePath = findMjsFile(SHARED_DIR)
  let content = readFileSync(filePath, 'utf8')
  let modified = false

  // 1. Add includePrivate to fetchGitHubSponsors' makeQuery call
  //    Before: const query = makeQuery(login, type, !config.includePastSponsors, cursor);
  //    After:  const query = makeQuery(login, type, !config.includePastSponsors, cursor, config.includePrivate);
  {
    const pattern = /(makeQuery\(login,\s*type,\s*!config\.includePastSponsors,\s*cursor)\)/
    if (pattern.test(content) && !content.match(/(makeQuery\(login,\s*type,\s*!config\.includePastSponsors,\s*cursor,\s*config\.includePrivate)\)/)) {
      content = content.replace(pattern, '$1, config.includePrivate)')
      modified = true
    }
  }

  // 2. Add includePrivate parameter to makeQuery function signature
  //    Before: function makeQuery(login, type, activeOnly = true, cursor) {
  //    After:  function makeQuery(login, type, activeOnly = true, cursor, includePrivate = false) {
  {
    const pattern = /(function makeQuery\(login,\s*type,\s*activeOnly\s*=\s*true,\s*cursor)\)\s*\{/
    if (pattern.test(content) && !content.match(/function makeQuery\(login,\s*type,\s*activeOnly\s*=\s*true,\s*cursor,\s*includePrivate\s*=\s*false\)\s*\{/)) {
      content = content.replace(pattern, '$1, includePrivate = false) {')
      modified = true
    }
  }

  // 3. Add includePrivate to the GraphQL sponsorshipsAsMaintainer query
  //    Before: sponsorshipsAsMaintainer(activeOnly: ${Boolean(activeOnly)}, first: 100${...})
  //    After:  sponsorshipsAsMaintainer(activeOnly: ${Boolean(activeOnly)}, includePrivate: ${Boolean(includePrivate)}, first: 100${...})
  {
    const pattern = /(sponsorshipsAsMaintainer\(activeOnly:\s*\$\{Boolean\(activeOnly\)\}),\s*first:\s*100\$/
    if (pattern.test(content) && !content.match(/sponsorshipsAsMaintainer\(activeOnly:\s*\$\{Boolean\(activeOnly\)\},\s*includePrivate:\s*\$\{Boolean\(includePrivate\)\},\s*first:\s*100\$/)) {
      content = content.replace(pattern, '$1, includePrivate: ${Boolean(includePrivate)}, first: 100$')
      modified = true
    }
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf8')
    console.log('[sponsorkit-patch] ✅ Applied includePrivate patch to', filePath)
  } else {
    console.log('[sponsorkit-patch] ℹ️  Patch already applied or pattern not found in', filePath)
  }
}

try {
  applyPatch()
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('[sponsorkit-patch] ℹ️  sponsorkit is not installed yet, skipping patch.')
  } else {
    console.error('[sponsorkit-patch] ⚠️  Failed to apply sponsorkit patch:', err.message)
    // Don't throw — let CI/build continue. The patch is a nice-to-have for includePrivate.
  }
}
