// src/components/ui/HomeCta.tsx

import React from 'react'; // Standard React import
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Assuming Button is from Shadcn UI
import { MessageSquare, LogIn, UserPlus } from 'lucide-react'; // Added UserPlus for Create Account, kept LogIn for Doctor
import { motion, type Variants } from 'framer-motion'; // Import motion and Variants type

// Define animation variants outside the component for performance and clarity
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
      ease: "easeOut", // Use a standard easing function
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
const HomeCta: React.FC = () => {
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
          Join thousands of expectant mothers and healthcare professionals using MomCare for better pregnancy support and management.
        </motion.p>

        {/* Animated Button Container */}
        <motion.div
          // Using gap-4 for consistency, adjust if needed
          className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5"
          variants={itemVariants} // Apply item animation variants to the container
        >
          {/* Button 1: Create Account (User Focus) */}
          <motion.div {...buttonMotionProps}>
            <Button
              size="lg"
              // Primary CTA style: White background, primary text
              className="rounded-lg bg-white px-8 py-3 text-base font-semibold text-momcare-primary shadow-md transition-shadow duration-300 hover:bg-gray-100 hover:shadow-lg"
              asChild
            >
              <Link to="/signup">
                <UserPlus aria-hidden="true" className="mr-2 h-5 w-5" /> {/* Icon for user signup */}
                Join as Patient
              </Link>
            </Button>
          </motion.div>

          {/* Button 2: Doctor Access (Distinct Style) */}
          <motion.div {...buttonMotionProps}>
            <Button
              size="lg"
              // Distinct Doctor style: Primary color background, white text
              className="rounded-lg bg-momcare-primary px-8 py-3 text-base font-semibold text-white shadow-md ring-1 ring-white/50 transition-all duration-300 hover:bg-momcare-primary/90 hover:shadow-lg hover:ring-white/70"
              asChild
            >
              <Link to="/doctor" onClick={() => window.scrollTo(0, 0)}>
                <LogIn aria-hidden="true" className="mr-2 h-5 w-5" /> {/* Icon for login/access */}
                Doctor Access
              </Link>
            </Button>
          </motion.div>

          {/* Button 3: Try AI Chat (Outline Style) */}
          <motion.div {...buttonMotionProps}>
            <Button
              size="lg"
              variant="outline"
              // Outline style: Transparent background, white border/text
              className="rounded-lg border-white px-8 py-3 text-base font-semibold text-white shadow-md transition-all duration-300 bg-transparent hover:bg-white/10 hover:text-white hover:shadow-lg"
              asChild
            >
              <Link to="/chat">
                <MessageSquare aria-hidden="true" className="mr-2 h-5 w-5" />
                Try AI Chat
              </Link>
            </Button>
          </motion.div>

        </motion.div>
      </div>
      {/* Optional: Add subtle background elements/shapes here */}
    </motion.section>
  );
};

export default HomeCta;