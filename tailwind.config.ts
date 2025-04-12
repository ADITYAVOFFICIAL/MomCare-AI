// tailwind.config.ts
import type { Config } from "tailwindcss";
import typography from '@tailwindcss/typography'; // Import the typography plugin

export default {
	darkMode: ["class"], // Enables dark mode based on the 'dark' class on the html or body tag
	content: [
		// Paths to all files that may contain Tailwind class names
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}", // Common practice to include src directory
	],
	prefix: "", // No prefix for utility classes (e.g., 'text-red-500' instead of 'tw-text-red-500')
	theme: {
		container: {
			center: true, // Center containers by default
			padding: '2rem', // Default padding for containers
			screens: {
				'2xl': '1400px', // Max width for the largest breakpoint
			},
		},
		extend: {
			// Define custom colors or override existing ones
			colors: {
				// Shadcn UI color variables (ensure these are defined in your global CSS)
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))', // Should map to momcare.primary via CSS vars
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))', // Should map to momcare.secondary via CSS vars
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))', // Should map to momcare.accent via CSS vars
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
				// Sidebar specific colors (if needed, based on your previous config)
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Your custom MomCare color palette
				momcare: {
					primary: '#7e57c2',   // Soft purple (Used for primary actions, headings)
					secondary: '#64b5f6', // Soft blue (Used for links, secondary elements)
					accent: '#f06292',    // Soft pink (Used for accents, hover states)
					light: '#f9f5ff',    // Very light purple (Used for backgrounds, highlights)
					dark: '#4527a0',     // Dark purple (Used for hover states, strong text)
				},
			},
			// Define custom border radius values based on CSS variables
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			// Define custom keyframes for animations
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
			},
			// Define custom animations using the keyframes
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
			},
			// Customize the @tailwindcss/typography plugin styles
			typography: ({ theme }) => ({
				DEFAULT: { // Base 'prose' styles (light mode)
					css: {
						// Base text color
						'--tw-prose-body': theme('colors.gray[700]'),
						// Headings color
						'--tw-prose-headings': theme('colors.momcare.primary'),
						'--tw-prose-lead': theme('colors.gray[600]'),
						// Links color
						'--tw-prose-links': theme('colors.momcare.secondary'),
						// Bold text color
						'--tw-prose-bold': theme('colors.momcare.dark'),
						// List counters and bullets color
						'--tw-prose-counters': theme('colors.momcare.primary'),
						'--tw-prose-bullets': theme('colors.momcare.primary'),
						// Horizontal rule color
						'--tw-prose-hr': theme('colors.gray[200]'),
						// Blockquote text and border color
						'--tw-prose-quotes': theme('colors.momcare.dark'),
						'--tw-prose-quote-borders': theme('colors.momcare.primary'),
						// Captions color
						'--tw-prose-captions': theme('colors.gray[500]'),
						// Inline code text color
						'--tw-prose-code': theme('colors.momcare.accent'),
						// Code block text color (base, highlight.js overrides specific tokens)
						'--tw-prose-pre-code': theme('colors.gray[200]'), // Light text for dark background
						// Code block background color
						'--tw-prose-pre-bg': theme('colors.gray[800]'), // Dark background for code
						// Table borders
						'--tw-prose-th-borders': theme('colors.gray[300]'),
						'--tw-prose-td-borders': theme('colors.gray[200]'),

						// --- Customizations beyond defaults ---
						// Link hover color
						'a:hover': {
							color: theme('colors.momcare.accent'), // Pink hover for links
						},
						// Ensure code block background has some padding and rounded corners
						'pre': {
							borderRadius: theme('borderRadius.md'),
							padding: theme('spacing.4'),
						},
						// Style images within prose
						'img': {
							borderRadius: theme('borderRadius.lg'), // Consistent rounded corners
							boxShadow: theme('boxShadow.md'),      // Add subtle shadow
							borderWidth: '1px',
							borderColor: theme('colors.gray.200'), // Light border
							marginTop: theme('spacing.6'),         // Add space around images
							marginBottom: theme('spacing.6'),
						},
					},
				},
				// Inverted 'prose' styles (for dark mode, applied via 'dark:prose-invert')
				invert: {
					css: {
						'--tw-prose-body': theme('colors.gray[300]'),
						'--tw-prose-headings': theme('colors.momcare.light'), // Light purple headings
						'--tw-prose-lead': theme('colors.gray[400]'),
						'--tw-prose-links': theme('colors.momcare.secondary'), // Keep blue links? Or adjust
						'--tw-prose-bold': theme('colors.white'),
						'--tw-prose-counters': theme('colors.momcare.light'),
						'--tw-prose-bullets': theme('colors.momcare.light'),
						'--tw-prose-hr': theme('colors.gray[700]'),
						'--tw-prose-quotes': theme('colors.gray[100]'),
						'--tw-prose-quote-borders': theme('colors.momcare.light'),
						'--tw-prose-captions': theme('colors.gray[400]'),
						'--tw-prose-code': theme('colors.momcare.accent'), // Keep pink inline code
						'--tw-prose-pre-code': theme('colors.gray[300]'), // Light text for code blocks
						'--tw-prose-pre-bg': 'rgb(31 41 55 / 80%)', // Slightly transparent dark bg
						'--tw-prose-th-borders': theme('colors.gray[600]'),
						'--tw-prose-td-borders': theme('colors.gray[700]'),

						// --- Dark Mode Customizations ---
						'a:hover': {
							color: theme('colors.momcare.accent'), // Keep pink hover?
						},
						'img': {
							borderColor: theme('colors.gray.700'), // Darker border for images in dark mode
						},
					},
				},
				// You could define other variants like 'prose-sm', 'prose-lg' here if needed
				// lg: { css: { ... } }
			}),
		},
	},
	// Register Tailwind plugins
	plugins: [
		require("tailwindcss-animate"), // For Shadcn UI animations
		typography,                   // The @tailwindcss/typography plugin
	],
} satisfies Config; // Use 'satisfies Config' for better TypeScript type checking