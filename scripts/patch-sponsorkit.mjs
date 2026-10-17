#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST_DIR = 'node_modules/sponsorkit/dist'

/**
 * Postinstall script to patch sponsorkit with includePrivate support
 * and the Patreon v2 campaigns endpoint.
 * This replaces the version-pinned pnpm patch with a flexible pattern-based approach
 * that survives dependabot version bumps.
 */

// v17 bundles providers in dist/shared/sponsorkit.*.mjs, v18 in dist/types-*.mjs
function findMjsFile(dir) {
  const candidates = [join(dir, 'shared'), dir].flatMap((d) => {
    try {
      return readdirSync(d).filter(f => f.endsWith('.mjs')).map(f => join(d, f))
    }
    catch {
      return []
    }
  })
  const mjsFile = candidates.find(f => readFileSync(f, 'utf8').includes('function makeQuery('))
  if (!mjsFile) {
    throw new Error(`Could not find sponsorkit provider bundle in ${dir}. Found: ${candidates.join(', ')}`)
  }
  return mjsFile
}

function applyPatch() {
  const filePath = findMjsFile(DIST_DIR)
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

  // 4. Patreon retired the v1 campaigns endpoint (410 Gone); use the v2 equivalent
  //    Before: https://www.patreon.com/api/oauth2/api/current_user/campaigns?include=null
  //    After:  https://www.patreon.com/api/oauth2/v2/campaigns
  {
    const v1 = 'https://www.patreon.com/api/oauth2/api/current_user/campaigns?include=null'
    if (content.includes(v1)) {
      content = content.replaceAll(v1, 'https://www.patreon.com/api/oauth2/v2/campaigns')
      modified = true
    }
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf8')
    console.log('[sponsorkit-patch] ✅ Applied patches to', filePath)
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
    // Don't throw — let CI/build continue.
  }
}
