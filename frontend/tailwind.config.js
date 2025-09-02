// frontend/tailwind.config.js
import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: { card: "0 1px 2px rgba(0,0,0,.06)" },
    },
  },
  plugins: [forms],
};
