// src/components/ui/HomeCta.tsx

import React from 'react'; // Standard React import
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Assuming Button is from Shadcn UI
import { MessageSquare } from 'lucide-react';
import { motion, type Variants } from 'framer-motion'; // Import motion and Variants type

// Define animation variants outside the component for performance and clarity
// Uses the Variants type from framer-motion for stricter TypeScript checking

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Delay between animating child elements
      delayChildren: 0.1,   // Initial delay before starting child animations
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 }, // Start faded out and slightly moved down
  visible: {
    opacity: 1,
    y: 0, // Animate to full opacity and original Y position
    transition: {
      duration: 0.6,
      // *** FIX: Replaced invalid cubic-bezier array with a standard easing string ***
      ease: "easeOut", // Use a standard easing function like "easeOut" or "easeInOut"
    },
  },
};

// Define reusable motion props for button hover/tap animations
const buttonMotionProps = {
  whileHover: { scale: 1.05, transition: { type: 'spring', stiffness: 300, damping: 15 } },
  whileTap: { scale: 0.95 },
};

/**
 * HomeCta Component: Renders the main Call-to-Action section for the homepage.
 * Includes animated text and buttons using Framer Motion.
 */
const HomeCta: React.FC = () => { // Use React.FC for functional component typing
  return (
    // Section container with motion for triggering animations on scroll
    <motion.section
      className="overflow-hidden bg-gradient-to-r from-momcare-primary to-momcare-dark py-20 text-white md:py-28"
      variants={containerVariants}
      initial="hidden" // Initial animation state
      whileInView="visible" // State to animate to when in view
      viewport={{ once: true, amount: 0.3 }} // Trigger animation once when 30% is visible
    >
      {/* Content wrapper with max-width and padding */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">

        {/* Animated Heading */}
        <motion.h2
          className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          variants={itemVariants} // Apply item animation variants
        >
          Start Your MomCare Journey Today
        </motion.h2>

        {/* Animated Paragraph */}
        <motion.p
          className="mx-auto mb-10 mt-4 max-w-3xl text-lg text-white/90 sm:text-xl"
          variants={itemVariants} // Apply item animation variants
        >
          Join thousands of expectant mothers who trust MomCare AI for personalized support and guidance throughout their pregnancy journey.
        </motion.p>

        {/* Animated Button Container */}
        <motion.div
          className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
          variants={itemVariants} // Apply item animation variants to the container
        >
          {/* Button 1: Create Account */}
          <motion.div {...buttonMotionProps}> {/* Apply hover/tap animations */}
            <Button
              size="lg"
              // Enhanced styling for better visual appeal and clarity
              className="rounded-lg bg-white px-8 py-3 text-base font-semibold text-momcare-primary shadow-md transition-shadow duration-300 hover:bg-gray-100 hover:shadow-lg"
              asChild // Use asChild to allow the Link component to be the actual interactive element
            >
              <Link to="/signup">
                Create Free Account
              </Link>
            </Button>
          </motion.div>

          {/* Button 2: Try AI Chat */}
          <motion.div {...buttonMotionProps}> {/* Apply hover/tap animations */}
            <Button
              size="lg"
              variant="outline"
              // Enhanced styling for better visual appeal and clarity
              className="rounded-lg border-white px-8 py-3 text-base font-semibold text-white shadow-md transition-all duration-300 bg-transparent hover:bg-white/10 hover:text-white hover:shadow-lg"
              asChild // Use asChild for the Link
            >
              <Link to="/chat">
                <MessageSquare aria-hidden="true" className="mr-2 h-5 w-5" /> {/* Added aria-hidden */}
                Try AI Chat
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
      {/* Optional: Add subtle background elements/shapes here with motion if desired */}
      {/* Example: <motion.div className="absolute inset-0 z-0 ..."> */}
    </motion.section>
  );
};

export default HomeCta;