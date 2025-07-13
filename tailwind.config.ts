// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./app/**/*.{js,ts,jsx,tsx}'], // Adjust based on your project
    theme: {
        extend: {
            colors: {
                primary: '#fff7eb',
                secondary: '#ff5757',
                light: {
                    100: '#D6C6FF',
                    200: '#A8B5DB',
                    300: '#9CA4AB'
                },
                accent: '#AB8BFF',
                dark: '#181922',
            },
            fontFamily: {
                telegraf: ['Telegraf'],
                radnika: ['Radnika']
            },
        },
    },
    plugins: [],
}
export default config;
