/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // <-- ESSENCIAL: Ativa o modo escuro via classe CSS
  content: ["./src/public/**/*.html", "./src/public/**/*.js"],
  theme: {
    extend: {
      colors: {
        dark: "#111827",
        medium: "#1F2937",
        light: "#374151",
        accent: "#4F46E5",
        "accent-hover": "#4338CA",
        "text-primary": "#F3F4F6",
        "text-secondary": "#9CA3AF",
      },
    },
  },
  plugins: [],
};
