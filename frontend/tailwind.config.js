/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand — teal/emerald (the green that's working well).
        // Used for: primary buttons, active nav, success states.
        brand: {
          50:  "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",  // primary buttons, active nav (StockPilot green)
          700: "#0f766e",  // primary hover
          800: "#115e59",
          900: "#134e4a",
        },
        // Accent — medium-dark blue. Used sparingly (~10–15% of UI):
        // links, info chips, secondary buttons, focus rings, sidebar accent rail,
        // chart strokes, AI / analytics highlights.
        accent: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",  // primary accent — medium-dark blue
          700: "#1d4ed8",  // accent hover
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)",
        lift: "0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)",
        ring: "0 0 0 1px rgba(15,23,42,0.06), 0 4px 12px -4px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};
