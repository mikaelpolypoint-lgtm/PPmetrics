/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Polypoint Colors
                pp: {
                    mint: {
                        100: '#EDF9FA',
                        200: '#E2F2F4',
                        500: '#7AB9C1',
                        700: '#078091',
                        800: '#007080',
                        830: '#055f6b',
                    },
                    blue: {
                        200: '#DFEFF7',
                        300: '#ADDDF7',
                        500: '#5AB1E0',
                        700: '#006AA4',
                        900: '#003A59',
                    },
                    grey: {
                        150: '#FCFCFC',
                        200: '#F4F4F4',
                        250: '#EDEDED',
                        300: '#E4E4E4',
                        400: '#CFCFD1',
                        500: '#BAB9BD',
                        700: '#717479',
                        750: '#606266',
                    },
                    black: '#303133',
                    green: {
                        default: '#55A642',
                        700: '#539443',
                    },
                    red: {
                        700: '#D44045',
                    },
                    yellow: {
                        500: '#FFEE91',
                        700: '#E5C300',
                    }
                }
            },
            boxShadow: {
                'glow-mint': '0 0 10px rgba(122, 185, 193, 0.1)',
                'glow-blue': '0 0 10px rgba(90, 177, 224, 0.1)',
            }
        },
    },
    plugins: [],
}
