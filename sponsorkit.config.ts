import { defineConfig, partitionTiers, tierPresets, type BadgePreset, type Sponsorship, type SvgComposer, type SponsorkitConfig } from 'sponsorkit'

const small: BadgePreset = {
    avatar: {
        size: 35,
    },
    boxWidth: 38,
    boxHeight: 38,
    container: {
        sidePadding: 30,
    },
}

const medium: BadgePreset = {
    avatar: {
        size: 50,
    },
    boxWidth: 80,
    boxHeight: 90,
    container: {
        sidePadding: 20,
    },
    name: {
        maxLength: 10,
    },
}

const large: BadgePreset = {
    avatar: {
        size: 70,
    },
    boxWidth: 95,
    boxHeight: 115,
    container: {
        sidePadding: 20,
    },
    name: {
        maxLength: 16,
    },
}

const xl: BadgePreset = {
    avatar: {
        size: 90,
    },
    boxWidth: 120,
    boxHeight: 130,
    container: {
        sidePadding: 20,
    },
    name: {
        maxLength: 20,
    },
}

const past: BadgePreset = {
    avatar: {
        size: 25,
    },
    boxWidth: 30,
    boxHeight: 30,
    container: {
        sidePadding: 30,
    },
}

const sponsors: BadgePreset = {
    avatar: {
        size: 42,
    },
    boxWidth: 52,
    boxHeight: 52,
    container: {
        sidePadding: 30,
    },
}

function getTierLabel(monthlyDollars: number): string {
    return tierLabels.find(t => monthlyDollars >= t.minDollars)?.label ?? '☕ Backer'
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function escapeXml(str: string): string {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function getPrivacyLevel(sponsorship: Sponsorship): string {
    return (sponsorship as Sponsorship & { privacyLevel?: string }).privacyLevel ?? 'PUBLIC'
}

function getSponsorDisplayName(sponsor: Sponsorship['sponsor']): string {
    const name = (sponsor.name || sponsor.login || '').trim()
    return name || 'Private Sponsor'
}

function movePastMembersBelowMembers<T extends { tier: { title?: string } }>(tierPartitions: T[]): T[] {
    const pastIndex = tierPartitions.findIndex(({ tier }) => tier.title === 'Past Members')
    if (pastIndex < 0) return tierPartitions

    const [pastMembersTier] = tierPartitions.splice(pastIndex, 1)
    const membersIndex = tierPartitions.findIndex(({ tier }) => tier.title === 'Members')
    if (membersIndex < 0) {
        tierPartitions.push(pastMembersTier)
        return tierPartitions
    }

    tierPartitions.splice(membersIndex + 1, 0, pastMembersTier)
    return tierPartitions
}

function normalizeIdentityPart(value?: string): string {
    return (value || '').trim().toLowerCase()
}

function getSponsorAggregateKey(sponsorship: Sponsorship): string {
    const provider = normalizeIdentityPart(String(sponsorship.provider || 'unknown'))
    const socialLogins = sponsorship.sponsor.socialLogins
    if (socialLogins && Object.keys(socialLogins).length > 0) {
        return Object.entries(socialLogins)
            .map(([provider, login]) => `${normalizeIdentityPart(provider)}:${normalizeIdentityPart(login)}`)
            .sort()
            .join('|')
    }

    const linkUrl = normalizeIdentityPart(sponsorship.sponsor.linkUrl || sponsorship.sponsor.websiteUrl)
    if (linkUrl) return linkUrl

    const login = normalizeIdentityPart(sponsorship.sponsor.login)
    if (login) return `${provider}|${login}`

    const name = normalizeIdentityPart(sponsorship.sponsor.name)
    if (name) return `${provider}|${name}`

    return `${provider}|${normalizeIdentityPart(sponsorship.createdAt || '')}|${normalizeIdentityPart(sponsorship.sponsor.avatarUrl)}`
}

function formatDollars(amount: number): string {
    const normalized = Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, '')
    return `$${normalized}`
}

function getContributionAmount(sponsorship: Sponsorship): number {
    const totalDollars = (sponsorship as Sponsorship & { totalDollars?: number }).totalDollars
    if (totalDollars != null && totalDollars > 0) {
        return totalDollars
    }

    if (sponsorship.monthlyDollars > 0) {
        return sponsorship.monthlyDollars
    }

    const tierAmount = sponsorship.tierName?.match(/\$([0-9]+(?:\.[0-9]+)?)/)?.[1]
    if (tierAmount) {
        return Number(tierAmount)
    }

    return 0
}

function composeLeaderboard(composer: SvgComposer, allSponsors: Sponsorship[], config: SponsorkitConfig, theme: 'dark' | 'light') {
    const isDark = theme === 'dark'
    const textColor = isDark ? '#e6edf3' : '#1f2328'
    const subTextColor = isDark ? '#8b949e' : '#656d76'
    const headerBg = isDark ? '#001a3a' : '#f6f8fa'
    const rowBg = isDark ? '#002451' : '#ffffff'
    const rowAltBg = isDark ? '#001a3a' : '#f6f8fa'
    const borderColor = isDark ? '#003366' : '#d0d7de'
    const accentColor = isDark ? '#00ff00' : '#007a00'

    const activeSponsors = allSponsors
        .filter(s => s.monthlyDollars > 0)
        .sort((a, b) => b.monthlyDollars - a.monthlyDollars)

    if (activeSponsors.length === 0) return

    const width = config.width || 800
    const tableX = 30
    const tableWidth = width - 60
    const rowHeight = 36
    const headerHeight = 40
    const colWidths = {
        rank: 50,
        name: tableWidth - 50 - 120 - 120 - 120,
        tier: 120,
        since: 120,
        amount: 120,
    }

    composer.addSpan(30)

    composer.addRaw(`<text x="${width / 2}" y="${composer.height}" text-anchor="middle" class="sponsorkit-tier-title">🏆 Sponsor Leaderboard</text>`)
    composer.height += 30

    // Table header
    const headerY = composer.height
    composer.addRaw(`<rect x="${tableX}" y="${headerY}" width="${tableWidth}" height="${headerHeight}" fill="${headerBg}" rx="6" ry="6"/>`)
    composer.addRaw(`<rect x="${tableX}" y="${headerY + headerHeight - 1}" width="${tableWidth}" height="1" fill="${borderColor}"/>`)

    let colX = tableX + 20
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">#</text>`)
    colX += colWidths.rank
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Sponsor</text>`)
    colX += colWidths.name
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Tier</text>`)
    colX += colWidths.tier
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Since</text>`)
    colX += colWidths.since
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">$/month</text>`)

    composer.height += headerHeight

    // Table rows
    activeSponsors.forEach((s, i) => {
        const rowY = composer.height
        const bg = i % 2 === 0 ? rowBg : rowAltBg
        const isLast = i === activeSponsors.length - 1

        if (isLast) {
            composer.addRaw(`<rect x="${tableX}" y="${rowY}" width="${tableWidth}" height="${rowHeight}" fill="${bg}" rx="0"/>`)
            composer.addRaw(`<rect x="${tableX}" y="${rowY + rowHeight - 6}" width="${tableWidth}" height="6" fill="${bg}" rx="6" ry="6"/>`)
        } else {
            composer.addRaw(`<rect x="${tableX}" y="${rowY}" width="${tableWidth}" height="${rowHeight}" fill="${bg}"/>`)
        }

        composer.addRaw(`<rect x="${tableX}" y="${rowY + rowHeight - 1}" width="${tableWidth}" height="1" fill="${borderColor}" opacity="0.5"/>`)

        let cx = tableX + 20
        const rankMedals = ['🥇', '🥈', '🥉']
        const rankLabel = i < 3 ? rankMedals[i] : `${i + 1}`
        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${textColor}" font-size="13">${rankLabel}</text>`)
        cx += colWidths.rank

        const name = escapeXml(getSponsorDisplayName(s.sponsor))
        const displayName = name.length > 20 ? name.slice(0, 18) + '…' : name
        const url = s.sponsor.websiteUrl || s.sponsor.linkUrl
        if (url) {
            composer.addRaw(`<a href="${escapeXml(url)}" target="_blank"><text x="${cx}" y="${rowY + 24}" fill="${accentColor}" font-size="13">${displayName}</text></a>`)
        } else {
            composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${textColor}" font-size="13">${displayName}</text>`)
        }
        cx += colWidths.name

        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${subTextColor}" font-size="12">${getTierLabel(s.monthlyDollars)}</text>`)
        cx += colWidths.tier

        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${subTextColor}" font-size="12">${formatDate(s.createdAt)}</text>`)
        cx += colWidths.since

        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${textColor}" font-size="13" font-weight="600">$${s.monthlyDollars}</text>`)

        composer.height += rowHeight
    })

    composer.addSpan(10)
}

function composePastSponsorsLeaderboard(composer: SvgComposer, allSponsors: Sponsorship[], config: SponsorkitConfig, theme: 'dark' | 'light') {
    const isDark = theme === 'dark'
    const textColor = isDark ? '#e6edf3' : '#1f2328'
    const subTextColor = isDark ? '#8b949e' : '#656d76'
    const headerBg = isDark ? '#001a3a' : '#f6f8fa'
    const rowBg = isDark ? '#002451' : '#ffffff'
    const rowAltBg = isDark ? '#001a3a' : '#f6f8fa'
    const borderColor = isDark ? '#003366' : '#d0d7de'
    const accentColor = isDark ? '#00ff00' : '#007a00'

    const pastSponsors = allSponsors
        .filter(s => s.monthlyDollars <= 0)
        .sort((a, b) => (a.sponsor.name || a.sponsor.login).localeCompare(b.sponsor.name || b.sponsor.login))

    if (pastSponsors.length === 0) return

    const width = config.width || 800
    const tableX = 30
    const tableWidth = width - 60
    const rowHeight = 36
    const headerHeight = 40
    const colWidths = {
        rank: 50,
        name: tableWidth - 50 - 140 - 140,
        since: 140,
        status: 140,
    }

    composer.addSpan(30)

    composer.addRaw(`<text x="${width / 2}" y="${composer.height}" text-anchor="middle" class="sponsorkit-tier-title">🕰️ Past Sponsors</text>`)
    composer.height += 30

    const headerY = composer.height
    composer.addRaw(`<rect x="${tableX}" y="${headerY}" width="${tableWidth}" height="${headerHeight}" fill="${headerBg}" rx="6" ry="6"/>`)
    composer.addRaw(`<rect x="${tableX}" y="${headerY + headerHeight - 1}" width="${tableWidth}" height="1" fill="${borderColor}"/>`)

    let colX = tableX + 20
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">#</text>`)
    colX += colWidths.rank
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Sponsor</text>`)
    colX += colWidths.name
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Joined</text>`)
    colX += colWidths.since
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Status</text>`)

    composer.height += headerHeight

    pastSponsors.forEach((s, i) => {
        const rowY = composer.height
        const bg = i % 2 === 0 ? rowBg : rowAltBg
        const isLast = i === pastSponsors.length - 1

        if (isLast) {
            composer.addRaw(`<rect x="${tableX}" y="${rowY}" width="${tableWidth}" height="${rowHeight}" fill="${bg}" rx="0"/>`)
            composer.addRaw(`<rect x="${tableX}" y="${rowY + rowHeight - 6}" width="${tableWidth}" height="6" fill="${bg}" rx="6" ry="6"/>`)
        } else {
            composer.addRaw(`<rect x="${tableX}" y="${rowY}" width="${tableWidth}" height="${rowHeight}" fill="${bg}"/>`)
        }

        composer.addRaw(`<rect x="${tableX}" y="${rowY + rowHeight - 1}" width="${tableWidth}" height="1" fill="${borderColor}" opacity="0.5"/>`)

        let cx = tableX + 20
        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${textColor}" font-size="13">${i + 1}</text>`)
        cx += colWidths.rank

        const name = escapeXml(getSponsorDisplayName(s.sponsor))
        const displayName = name.length > 20 ? name.slice(0, 18) + '…' : name
        const url = s.sponsor.websiteUrl || s.sponsor.linkUrl
        if (url) {
            composer.addRaw(`<a href="${escapeXml(url)}" target="_blank"><text x="${cx}" y="${rowY + 24}" fill="${accentColor}" font-size="13">${displayName}</text></a>`)
        } else {
            composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${textColor}" font-size="13">${displayName}</text>`)
        }
        cx += colWidths.name

        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${subTextColor}" font-size="12">${formatDate(s.createdAt)}</text>`)
        cx += colWidths.since

        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${subTextColor}" font-size="12">Past Sponsor</text>`)

        composer.height += rowHeight
    })

    composer.addSpan(10)
}

function composeAllTimeLeaderboard(composer: SvgComposer, allSponsors: Sponsorship[], config: SponsorkitConfig, theme: 'dark' | 'light') {
    const isDark = theme === 'dark'
    const textColor = isDark ? '#e6edf3' : '#1f2328'
    const subTextColor = isDark ? '#8b949e' : '#656d76'
    const headerBg = isDark ? '#001a3a' : '#f6f8fa'
    const rowBg = isDark ? '#002451' : '#ffffff'
    const rowAltBg = isDark ? '#001a3a' : '#f6f8fa'
    const borderColor = isDark ? '#003366' : '#d0d7de'
    const accentColor = isDark ? '#00ff00' : '#007a00'
    const activeColor = isDark ? '#3fb950' : '#1a7f37'
    const inactiveColor = isDark ? '#f85149' : '#cf222e'

    type AggregatedSponsor = {
        sponsor: Sponsorship['sponsor']
        createdAt?: string
        totalAmount: number
        highestMonthlyDollars: number
        isActive: boolean
    }

    const aggregateMap = new Map<string, AggregatedSponsor>()
    for (const sponsorship of allSponsors) {
        const key = getSponsorAggregateKey(sponsorship)
        const contributionAmount = getContributionAmount(sponsorship)
        const currentMonthlyAmount = Math.max(0, sponsorship.monthlyDollars)
        const existing = aggregateMap.get(key)

        if (!existing) {
            aggregateMap.set(key, {
                sponsor: sponsorship.sponsor,
                createdAt: sponsorship.createdAt,
                totalAmount: contributionAmount,
                highestMonthlyDollars: currentMonthlyAmount,
                isActive: sponsorship.monthlyDollars > 0,
            })
            continue
        }

        existing.totalAmount += contributionAmount
        existing.highestMonthlyDollars = Math.max(existing.highestMonthlyDollars, currentMonthlyAmount)
        existing.isActive = existing.isActive || sponsorship.monthlyDollars > 0

        const existingDate = existing.createdAt ? Date.parse(existing.createdAt) : Number.NaN
        const sponsorDate = sponsorship.createdAt ? Date.parse(sponsorship.createdAt) : Number.NaN
        if (!Number.isNaN(sponsorDate) && (Number.isNaN(existingDate) || sponsorDate < existingDate)) {
            existing.createdAt = sponsorship.createdAt
        }

        const existingHasUrl = Boolean(existing.sponsor.websiteUrl || existing.sponsor.linkUrl)
        const sponsorHasUrl = Boolean(sponsorship.sponsor.websiteUrl || sponsorship.sponsor.linkUrl)
        if (!existingHasUrl && sponsorHasUrl) {
            existing.sponsor = sponsorship.sponsor
        }
    }

    const aggregatedSponsors = Array.from(aggregateMap.values())
        .sort((a, b) => {
            if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount
            const byDate = (a.createdAt || '').localeCompare(b.createdAt || '')
            if (byDate !== 0) return byDate
            return (a.sponsor.name || a.sponsor.login).localeCompare(b.sponsor.name || b.sponsor.login)
        })

    if (aggregatedSponsors.length === 0) return

    const width = config.width || 800
    const tableX = 30
    const tableWidth = width - 60
    const rowHeight = 36
    const headerHeight = 40
    const colWidths = {
        rank: 50,
        name: tableWidth - 50 - 100 - 120 - 120 - 100,
        tier: 100,
        since: 120,
        amount: 120,
        status: 100,
    }

    composer.addSpan(30)

    composer.addRaw(`<text x="${width / 2}" y="${composer.height}" text-anchor="middle" class="sponsorkit-tier-title">🏆 All-Time Leaderboard</text>`)
    composer.height += 30

    const headerY = composer.height
    composer.addRaw(`<rect x="${tableX}" y="${headerY}" width="${tableWidth}" height="${headerHeight}" fill="${headerBg}" rx="6" ry="6"/>`)
    composer.addRaw(`<rect x="${tableX}" y="${headerY + headerHeight - 1}" width="${tableWidth}" height="1" fill="${borderColor}"/>`)

    let colX = tableX + 20
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">#</text>`)
    colX += colWidths.rank
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Sponsor</text>`)
    colX += colWidths.name
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Tier</text>`)
    colX += colWidths.tier
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Since</text>`)
    colX += colWidths.since
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Combined</text>`)
    colX += colWidths.amount
    composer.addRaw(`<text x="${colX}" y="${headerY + 26}" fill="${subTextColor}" font-size="12" font-weight="600">Status</text>`)

    composer.height += headerHeight

    aggregatedSponsors.forEach((s, i) => {
        const rowY = composer.height
        const bg = i % 2 === 0 ? rowBg : rowAltBg
        const isLast = i === aggregatedSponsors.length - 1

        if (isLast) {
            composer.addRaw(`<rect x="${tableX}" y="${rowY}" width="${tableWidth}" height="${rowHeight}" fill="${bg}" rx="0"/>`)
            composer.addRaw(`<rect x="${tableX}" y="${rowY + rowHeight - 6}" width="${tableWidth}" height="6" fill="${bg}" rx="6" ry="6"/>`)
        } else {
            composer.addRaw(`<rect x="${tableX}" y="${rowY}" width="${tableWidth}" height="${rowHeight}" fill="${bg}"/>`)
        }

        composer.addRaw(`<rect x="${tableX}" y="${rowY + rowHeight - 1}" width="${tableWidth}" height="1" fill="${borderColor}" opacity="0.5"/>`)

        let cx = tableX + 20
        const rankMedals = ['🥇', '🥈', '🥉']
        const rankLabel = i < 3 ? rankMedals[i] : `${i + 1}`
        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${textColor}" font-size="13">${rankLabel}</text>`)
        cx += colWidths.rank

        const name = escapeXml(getSponsorDisplayName(s.sponsor))
        const displayName = name.length > 20 ? name.slice(0, 18) + '…' : name
        const url = s.sponsor.websiteUrl || s.sponsor.linkUrl
        if (url) {
            composer.addRaw(`<a href="${escapeXml(url)}" target="_blank"><text x="${cx}" y="${rowY + 24}" fill="${accentColor}" font-size="13">${displayName}</text></a>`)
        } else {
            composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${textColor}" font-size="13">${displayName}</text>`)
        }
        cx += colWidths.name

        const tierLabel = s.highestMonthlyDollars > 0 ? getTierLabel(s.highestMonthlyDollars) : '—'
        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${subTextColor}" font-size="12">${tierLabel}</text>`)
        cx += colWidths.tier

        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${subTextColor}" font-size="12">${formatDate(s.createdAt)}</text>`)
        cx += colWidths.since

        const amountDisplay = s.totalAmount > 0 ? formatDollars(s.totalAmount) : '—'
        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${textColor}" font-size="13" font-weight="600">${amountDisplay}</text>`)
        cx += colWidths.amount

        const statusLabel = s.isActive ? '✅ Active' : '⏸️ Past'
        const statusColor = s.isActive ? activeColor : inactiveColor
        composer.addRaw(`<text x="${cx}" y="${rowY + 24}" fill="${statusColor}" font-size="12">${statusLabel}</text>`)

        composer.height += rowHeight
    })

    composer.addSpan(10)
}

function composeCurrentSponsors(composer: SvgComposer, allSponsors: Sponsorship[], config: SponsorkitConfig, theme: 'dark' | 'light') {
    const isDark = theme === 'dark'
    const subTextColor = isDark ? '#8b949e' : '#656d76'

    const activeSponsors = allSponsors.filter(s => s.monthlyDollars > 0)
    const totalActive = activeSponsors.length
    const totalPrivate = activeSponsors.filter(s => getPrivacyLevel(s) === 'PRIVATE').length
    const totalMonthly = activeSponsors.reduce((sum, s) => sum + s.monthlyDollars, 0)

    if (totalActive === 0 && totalPrivate === 0) return

    const width = config.width || 800

    composer.addSpan(20)
    composer.addRaw(`<text x="${width / 2}" y="${composer.height}" text-anchor="middle" class="sponsorkit-tier-title">📊 Sponsor Stats</text>`)
    composer.height += 25

    const stats = [
        `${totalActive}${totalPrivate > 0 ? ` (+${totalPrivate} private)` : ''} active sponsors`,
        `$${totalMonthly}/month total`,
    ].join('  •  ')

    composer.addRaw(`<text x="${width / 2}" y="${composer.height}" text-anchor="middle" fill="${subTextColor}" font-size="13">${stats}</text>`)
    composer.height += 20
}

const inlineCSS = `
    text {
      font-weight: 300;
      font-size: 14px;
      fill: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    .sponsorkit-link {
      cursor: pointer;
    }
    .sponsorkit-tier-title {
      font-weight: 500;
      font-size: 20px;
    }
`

const tierLabels: { minDollars: number; label: string }[] = [
    { minDollars: 500, label: '💎 Platinum' },
    { minDollars: 100, label: '🥇 Gold' },
    { minDollars: 50, label: '🥈 Silver' },
    { minDollars: 25, label: '🥉 Bronze' },
    { minDollars: 10, label: '🟢 Member' },
    { minDollars: 0, label: '☕ Backer' },
]

const sharedTiers = [
    {
        title: 'Past Members',
        monthlyDollars: -1,
        preset: past,
    },
    {
        title: 'Backers',
        preset: small,
    },
    {
        title: 'Members',
        monthlyDollars: 10,
        preset: sponsors,
    },
    {
        title: 'Bronze Members',
        monthlyDollars: 25,
        preset: medium,
    },
    {
        title: 'Silver Members',
        monthlyDollars: 50,
        preset: medium,
    },
    {
        title: 'Gold Members',
        monthlyDollars: 100,
        preset: large,
    },
    {
        title: 'Platinum Sponsors',
        monthlyDollars: 500,
        preset: xl,
    },
]

function makeCustomComposer(theme: 'dark' | 'light') {
    return async (composer: SvgComposer, allSponsors: Sponsorship[], config: SponsorkitConfig) => {
        const tierPartitions = partitionTiers(allSponsors, config.tiers!, config.includePastSponsors)
        movePastMembersBelowMembers(tierPartitions)

        composer.addSpan(config.padding?.top ?? 20)

        for (const { tier: t, sponsors: tierSponsors } of tierPartitions) {
            t.composeBefore?.(composer, tierSponsors, config)
            if (t.compose) {
                t.compose(composer, tierSponsors, config)
            } else {
                const preset = t.preset || tierPresets.base
                if (tierSponsors.length && preset.avatar.size) {
                    const paddingTop = t.padding?.top ?? 20
                    const paddingBottom = t.padding?.bottom ?? 10
                    if (paddingTop) composer.addSpan(paddingTop)
                    if (t.title) {
                        composer.addTitle(t.title).addSpan(5)
                    }
                    await composer.addSponsorGrid(tierSponsors, preset)
                    if (paddingBottom) composer.addSpan(paddingBottom)
                }
            }
            t.composeAfter?.(composer, tierSponsors, config)
        }

        composeCurrentSponsors(composer, allSponsors, config, theme)
        composeLeaderboard(composer, allSponsors, config, theme)

        composer.addSpan(config.padding?.bottom ?? 20)
    }
}

function makePastSponsorsComposer(theme: 'dark' | 'light') {
    return async (composer: SvgComposer, allSponsors: Sponsorship[], config: SponsorkitConfig) => {
        const pastSponsors = allSponsors.filter(s => s.monthlyDollars <= 0)
        const tierPartitions = partitionTiers(pastSponsors, config.tiers!, config.includePastSponsors)

        composer.addSpan(config.padding?.top ?? 20)

        for (const { tier: t, sponsors: tierSponsors } of tierPartitions) {
            t.composeBefore?.(composer, tierSponsors, config)
            if (t.compose) {
                t.compose(composer, tierSponsors, config)
            } else {
                const preset = t.preset || tierPresets.base
                if (tierSponsors.length && preset.avatar.size) {
                    const paddingTop = t.padding?.top ?? 20
                    const paddingBottom = t.padding?.bottom ?? 10
                    if (paddingTop) composer.addSpan(paddingTop)
                    if (t.title) {
                        composer.addTitle(t.title).addSpan(5)
                    }
                    await composer.addSponsorGrid(tierSponsors, preset)
                    if (paddingBottom) composer.addSpan(paddingBottom)
                }
            }
            t.composeAfter?.(composer, tierSponsors, config)
        }

        composePastSponsorsLeaderboard(composer, allSponsors, config, theme)

        composer.addSpan(config.padding?.bottom ?? 20)
    }
}

function makeAllTimeComposer(theme: 'dark' | 'light') {
    return async (composer: SvgComposer, allSponsors: Sponsorship[], config: SponsorkitConfig) => {
        const tierPartitions = partitionTiers(allSponsors, config.tiers!, config.includePastSponsors)
        movePastMembersBelowMembers(tierPartitions)

        composer.addSpan(config.padding?.top ?? 20)

        for (const { tier: t, sponsors: tierSponsors } of tierPartitions) {
            t.composeBefore?.(composer, tierSponsors, config)
            if (t.compose) {
                t.compose(composer, tierSponsors, config)
            } else {
                const preset = t.preset || tierPresets.base
                if (tierSponsors.length && preset.avatar.size) {
                    const paddingTop = t.padding?.top ?? 20
                    const paddingBottom = t.padding?.bottom ?? 10
                    if (paddingTop) composer.addSpan(paddingTop)
                    if (t.title) {
                        composer.addTitle(t.title).addSpan(5)
                    }
                    await composer.addSponsorGrid(tierSponsors, preset)
                    if (paddingBottom) composer.addSpan(paddingBottom)
                }
            }
            t.composeAfter?.(composer, tierSponsors, config)
        }

        composeCurrentSponsors(composer, allSponsors, config, theme)
        composeAllTimeLeaderboard(composer, allSponsors, config, theme)

        composer.addSpan(config.padding?.bottom ?? 20)
    }
}

export default defineConfig({
    includePrivate: true,
    sponsorsAutoMerge: true,
    outputDir: '.',
    formats: ['json', 'svg', 'png', 'webp'],

    renders: [
        {
            name: 'sponsors',
            renderer: 'tiers',
            includePastSponsors: true,
            svgInlineCSS: inlineCSS.replace('fill: #fff;', 'fill: #00ff00;'),
            tiers: sharedTiers,
            customComposer: makeCustomComposer('dark'),
            onSvgGenerated(svg) {
                return svg
                    .replace(
                        /^(<svg[^>]*>)/,
                        '$1<rect x="0" y="0" width="100%" height="100%" fill="#002451" rx="8"/>',
                    )
                    .replace(/<a /g, '<a rel="nofollow noreferrer noopener" ')
            },
        },
        {
            name: 'sponsors.light',
            renderer: 'tiers',
            formats: ['svg', 'png', 'webp'],
            includePastSponsors: true,
            svgInlineCSS: inlineCSS.replace('fill: #fff;', 'fill: #1f2328;'),
            tiers: sharedTiers,
            customComposer: makeCustomComposer('light'),
            onSvgGenerated(svg) {
                return svg
                    .replace(
                        /^(<svg[^>]*>)/,
                        '$1<rect x="0" y="0" width="100%" height="100%" fill="#ffffff" rx="8"/>',
                    )
                    .replace(/<a /g, '<a rel="nofollow noreferrer noopener" ')
            },
        },
        {
            name: 'past-sponsors',
            renderer: 'tiers',
            formats: ['svg', 'png', 'webp'],
            includePastSponsors: true,
            svgInlineCSS: inlineCSS.replace('fill: #fff;', 'fill: #00ff00;'),
            tiers: [
                {
                    title: 'Past Members',
                    preset: past,
                },
            ],
            customComposer: makePastSponsorsComposer('dark'),
            onSvgGenerated(svg) {
                return svg
                    .replace(
                        /^(<svg[^>]*>)/,
                        '$1<rect x="0" y="0" width="100%" height="100%" fill="#002451" rx="8"/>',
                    )
                    .replace(/<a /g, '<a rel="nofollow noreferrer noopener" ')
            },
        },
        {
            name: 'past-sponsors.light',
            renderer: 'tiers',
            formats: ['svg', 'png', 'webp'],
            includePastSponsors: true,
            svgInlineCSS: inlineCSS.replace('fill: #fff;', 'fill: #1f2328;'),
            tiers: [
                {
                    title: 'Past Members',
                    preset: past,
                },
            ],
            customComposer: makePastSponsorsComposer('light'),
            onSvgGenerated(svg) {
                return svg
                    .replace(
                        /^(<svg[^>]*>)/,
                        '$1<rect x="0" y="0" width="100%" height="100%" fill="#ffffff" rx="8"/>',
                    )
                    .replace(/<a /g, '<a rel="nofollow noreferrer noopener" ')
            },
        },
        {
            name: 'all-time-leaderboard',
            renderer: 'tiers',
            formats: ['svg', 'png', 'webp'],
            includePastSponsors: true,
            svgInlineCSS: inlineCSS.replace('fill: #fff;', 'fill: #00ff00;'),
            tiers: sharedTiers,
            customComposer: makeAllTimeComposer('dark'),
            onSvgGenerated(svg) {
                return svg
                    .replace(
                        /^(<svg[^>]*>)/,
                        '$1<rect x="0" y="0" width="100%" height="100%" fill="#002451" rx="8"/>',
                    )
                    .replace(/<a /g, '<a rel="nofollow noreferrer noopener" ')
            },
        },
        {
            name: 'all-time-leaderboard.light',
            renderer: 'tiers',
            formats: ['svg', 'png', 'webp'],
            includePastSponsors: true,
            svgInlineCSS: inlineCSS.replace('fill: #fff;', 'fill: #1f2328;'),
            tiers: sharedTiers,
            customComposer: makeAllTimeComposer('light'),
            onSvgGenerated(svg) {
                return svg
                    .replace(
                        /^(<svg[^>]*>)/,
                        '$1<rect x="0" y="0" width="100%" height="100%" fill="#ffffff" rx="8"/>',
                    )
                    .replace(/<a /g, '<a rel="nofollow noreferrer noopener" ')
            },
        },
    ],
})
