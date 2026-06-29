/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16202A",
        field: "#F7F8FA",
        civic: "#0F766E",
        amber: "#B7791F",
      },
    },
  },
  plugins: [],
}
