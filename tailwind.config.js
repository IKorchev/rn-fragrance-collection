/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Loaded in src/app/_layout.tsx via @expo-google-fonts/fraunces —
        // RN needs the exact registered font name, not a CSS-style stack
        display: ["Fraunces_600SemiBold"],
      },
    },
  },
  plugins: [],
}
