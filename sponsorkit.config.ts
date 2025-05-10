import { defineConfig, BadgePreset } from 'sponsorkit'

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
        size: 20,
    },
    boxWidth: 22,
    boxHeight: 22,
    container: {
        sidePadding: 35,
    },
    name: {
        color: '#00ff00'
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

export default defineConfig({    
    tiers: [
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
    ],
    sponsorsAutoMerge: true,
    outputDir: '.',
    formats: ['json', 'svg', 'png', 'webp'],
    renderer: 'tiers',
})
