/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/public/**/*.html", // Observa todos os arquivos HTML
    "./src/public/**/*.js", // Observa todos os arquivos JS
  ],
  theme: {
    extend: {
      // NOVO: Definindo nossa paleta de cores customizada
      colors: {
        dark: "#111827", // bg-gray-900 (Fundo principal)
        medium: "#1F2937", // bg-gray-800 (Cor do Cartão/Modal)
        light: "#374151", // bg-gray-700 (Bordas/Inputs)
        accent: "#4F46E5", // bg-indigo-600 (Botão principal)
        "accent-hover": "#4338CA", // bg-indigo-700 (Hover do botão)
        "text-primary": "#F3F4F6", // text-gray-100 (Texto principal)
        "text-secondary": "#9CA3AF", // text-gray-400 (Texto secundário)
      },
    },
  },
  plugins: [],
};
