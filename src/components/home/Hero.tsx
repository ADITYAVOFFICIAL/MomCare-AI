// src/components/Hero.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // Assuming you use react-router
import { Button } from '@/components/ui/button'; // Adjust path if needed
import { MessageSquare, Heart, ArrowRight } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

// --- Framer Motion Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 15,
    },
  },
};

const imageVariants: Variants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 50,
            delay: 0.4 // Delay image slightly after text
        }
    }
}

// --- Component Definition ---
const Hero: React.FC = () => {
  // Array for background hearts configuration
  const backgroundHearts = [
    { top: '10%', left: '5%', size: 'text-6xl', opacity: 'opacity-10 dark:opacity-5', duration: '15s', delay: '0s' },
    { top: '20%', left: '80%', size: 'text-4xl', opacity: 'opacity-15 dark:opacity-10', duration: '20s', delay: '3s' },
    { top: '60%', left: '15%', size: 'text-7xl', opacity: 'opacity-5 dark:opacity-5', duration: '18s', delay: '1s' },
    { top: '80%', left: '70%', size: 'text-5xl', opacity: 'opacity-10 dark:opacity-10', duration: '22s', delay: '5s' },
    { top: '40%', left: '45%', size: 'text-3xl', opacity: 'opacity-20 dark:opacity-15', duration: '16s', delay: '2s' },
    { top: '90%', left: '5%', size: 'text-6xl', opacity: 'opacity-10 dark:opacity-5', duration: '19s', delay: '4s' },
     { top: '5%', left: '40%', size: 'text-5xl', opacity: 'opacity-15 dark:opacity-10', duration: '21s', delay: '6s' },
  ];

  return (
    // Main section container with Framer Motion animation
    <motion.section
      className="relative overflow-hidden bg-gradient-to-br from-purple-100 via-blue-50 to-pink-100 dark:from-purple-900/30 dark:via-blue-900/20 dark:to-pink-900/30 py-24 md:py-36"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-labelledby="hero-heading" // Accessibility
    >
      {/* Abstract Background Blobs (Optional Layer) */}
      <div className="absolute inset-0 z-0 opacity-30 dark:opacity-10" aria-hidden="true">
        <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-purple-200 dark:bg-purple-800 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-[-50px] right-[-50px] w-72 h-72 bg-pink-200 dark:bg-pink-800 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute top-[50%] left-[20%] w-48 h-48 bg-blue-200 dark:bg-blue-800 rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* Moving Hearts Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {backgroundHearts.map((heart, index) => (
          <Heart
            key={index}
            className={`absolute text-momcare-accent dark:text-pink-500/50 animate-drift ${heart.size} ${heart.opacity}`}
            style={{
              top: heart.top,
              left: heart.left,
              animationDuration: heart.duration,
              animationDelay: heart.delay,
            }}
            fill="currentColor"
          />
        ))}
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

          {/* Text Content Area */}
          <motion.div
            className="md:pr-8 text-center md:text-left"
            variants={containerVariants} // Stagger children within this div
          >
            <motion.h1
              id="hero-heading" // Link aria-labelledby
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-momcare-primary dark:text-momcare-light tracking-tight leading-tight relative"
              variants={itemVariants}
            >
              Welcome to <span className="text-momcare-accent dark:text-pink-400">MomCare AI</span>
              <Heart className="absolute top-[-0.5rem] right-[5rem] md:right-[-1rem] lg:right-[-2rem] text-momcare-accent opacity-15 dark:opacity-25 text-6xl md:text-8xl transform -rotate-12 pointer-events-none" aria-hidden="true" />
              <span className="absolute -top-10 right-58 text-momcare-accent opacity-20 text-7xl font-bold">♡</span>
            </motion.h1>

            <motion.p
              className="mt-5 md:mt-6 text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-xl mx-auto md:mx-0"
              variants={itemVariants}
            >
              Your AI-powered companion for a confident pregnancy journey. Get personalized support, track milestones, and connect with resources.
            </motion.p>

            <motion.div
              className="mt-8 md:mt-10 flex flex-col sm:flex-row sm:justify-center md:justify-start gap-4"
              variants={itemVariants} // Animate button group together
            >
              <Button
                size="lg"
                className="bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-accent dark:hover:bg-pink-500 text-white font-semibold text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 px-8 py-3 rounded-full group"
                asChild
              >
                <Link to="/chat">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Chat with AI
                  <ArrowRight className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-momcare-primary text-momcare-primary hover:bg-momcare-light dark:border-momcare-light dark:text-momcare-light dark:hover:bg-purple-900/50 hover:text-momcare-dark dark:hover:text-white font-semibold text-base transition-all duration-300 px-8 py-3 rounded-full shadow-sm hover:shadow-md"
                asChild
              >
                <Link to="/signup">
                  <Heart className="mr-2 h-5 w-5" />
                  Join MomCare
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Image Area */}
          <motion.div
            className="mt-10 md:mt-0"
            variants={imageVariants}
          >
            <div className="relative">
              {/* Decorative Elements */}
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent dark:from-blue-900/50 rounded-full opacity-60 filter blur-lg z-0" aria-hidden="true"></div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-tl from-pink-100 to-transparent dark:from-pink-900/50 rounded-full opacity-60 filter blur-lg z-0" aria-hidden="true"></div>

              <img
                // Consider fetching image URL via props or using a static import
                src="https://cdn.vectorstock.com/i/500p/27/78/pregnancy-cycle-of-thin-woman-during-period-vector-53402778.jpg"
                alt="Supportive pregnancy journey with MomCare AI"
                className="w-full h-auto rounded-3xl shadow-xl relative z-10 aspect-square md:aspect-[4/3] object-cover transform transition-transform duration-500 hover:scale-105"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </motion.section>
  );
};

export default Hero;