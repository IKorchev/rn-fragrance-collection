/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.js", "./components/**/*.js", "./Contexts/**/*.js", "./lib/**/*.js"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
