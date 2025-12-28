import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        "gradient-start": "hsl(var(--gradient-start))",
        "gradient-mid": "hsl(var(--gradient-mid))",
        "gradient-end": "hsl(var(--gradient-end))",
        "gradient-accent": "hsl(var(--gradient-accent))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        // Elegant page transitions
        "page-enter": {
          "0%": { opacity: "0", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "page-exit": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.98)" },
        },
        // Stck-specific transitions - peaceful and elegant
        "stck-enter": {
          "0%": { opacity: "0", transform: "scale(1.05)", filter: "blur(10px)" },
          "100%": { opacity: "1", transform: "scale(1)", filter: "blur(0px)" },
        },
        "stck-exit": {
          "0%": { opacity: "1", transform: "scale(1)", filter: "blur(0px)" },
          "100%": { opacity: "0", transform: "scale(0.95)", filter: "blur(10px)" },
        },
        // Staggered content reveals
        "content-reveal": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "content-hide": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-10px)" },
        },
        // Subtle float for peaceful feel
        "gentle-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        // Breathe animation for living UI elements
        "breathe": {
          "0%, 100%": { opacity: "0.7", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "accordion-up": "accordion-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in": "fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-out": "fade-out 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-out": "scale-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in": "slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        // Page transitions
        "page-enter": "page-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "page-exit": "page-exit 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        // Stck elegant transitions - longer for peaceful feel
        "stck-enter": "stck-enter 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
        "stck-exit": "stck-exit 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        // Content reveals with stagger support
        "content-reveal": "content-reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "content-hide": "content-hide 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        // Ambient animations
        "gentle-float": "gentle-float 6s ease-in-out infinite",
        "breathe": "breathe 4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'elegant': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'soft': 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      transitionDuration: {
        'slow': '600ms',
        'slower': '800ms',
        'slowest': '1000ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
