module.exports = {
    content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
    theme: {
        fontFamily: {
            'sans': [],
            'roboto': ['Roboto', 'sans-serif'],
        },
        extend: {
            keyframes: {
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                }
            },
            animation: {
                shimmer: 'shimmer 2.1s ease-in-out infinite'
            }
        }
    },
    plugins: [],
};