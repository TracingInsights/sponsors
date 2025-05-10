import { defineConfig, BadgePreset } from 'sponsorkit'
import * as fs from 'fs'
import * as path from 'path'

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

// Function to post-process SVG files
const postProcessSVG = () => {
    const outputDir = '.'
    const svgFiles = ['sponsors.svg']
    
    // Process each SVG file
    svgFiles.forEach(filename => {
        const filePath = path.join(outputDir, filename)
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
            try {
                // Read the SVG file
                const svgContent = fs.readFileSync(filePath, 'utf8')
                
                // Add rel="nofollow noreferrer noopener" to all links and set text color to #00ff00
                const modifiedSvg = svgContent
                    .replace(/<a /g, '<a rel="nofollow noreferrer noopener" ')
                    
                
                // Write the modified SVG back to the file
                fs.writeFileSync(filePath, modifiedSvg, 'utf8')
                console.log(`Successfully processed ${filename}`)
            } catch (error) {
                console.error(`Error processing ${filename}:`, error)
            }
        }
    })
}

export default defineConfig({    
    // Set global SVG styling
    svgInlineCSS: `
        text {
          font-weight: 300;
          font-size: 14px;
          fill: #00ff00;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        .sponsorkit-link {
          cursor: pointer;
        }
        .sponsorkit-tier-title {
          font-weight: 500;
          font-size: 20px;
        }
        `,
    
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

// Run post-processing after the config is exported
setTimeout(postProcessSVG, 5000) // Wait 5 seconds for SponsorKit to generate files
