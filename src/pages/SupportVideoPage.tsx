// src/pages/SupportVideoPage.tsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { PlayCircle, Film, ChevronLeft, Video } from 'lucide-react'; // Added Video icon
import { motion, AnimatePresence, type Variants } from 'framer-motion'; // Import motion and types
import { supportVideosData, type SupportVideoInfo } from '@/lib/supportVideos'; // Import the data and type

// Animation Variants
const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Stagger animation for list items
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const playerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.3, ease: 'easeIn' },
      },
  };


/**
 * SupportVideoPage Component: Allows users to select and watch support videos.
 */
const SupportVideoPage: React.FC = () => {
  // State to hold the ID (filename) of the currently selected video
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Find the full video info object based on the selected ID
  const selectedVideoInfo = useMemo(() => {
    if (!selectedVideoId) return null;
    return supportVideosData.find((v) => v.id === selectedVideoId) ?? null;
  }, [selectedVideoId]);

  // Handler to set the selected video ID
  const handlePlayVideo = (videoId: string): void => {
    setSelectedVideoId(videoId);
  };

  // Handler to clear the selection and go back
  const handleGoBack = (): void => {
    setSelectedVideoId(null);
  };

  // Effect to scroll to and play the video when selectedVideoId changes
  useEffect(() => {
    if (selectedVideoInfo && videoRef.current) {
      // Scroll smoothly into view
      videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Attempt to play, catching potential browser restrictions
      videoRef.current.play().catch((error) => {
        // console.warn('Video autoplay prevented:', error);
        // Optionally inform the user they might need to press play manually
      });
    }
  }, [selectedVideoInfo]); // Depend on the derived info object

  // --- Helper Functions for Rendering ---

  const renderSelectionButton = (video: SupportVideoInfo): React.ReactNode => {
    // Determine button style based on data or default
    const getVariantClass = () => {
      switch (video.buttonVariant) {
        case 'secondary':
          return 'bg-momcare-secondary hover:bg-momcare-secondary/90 text-white';
        case 'accent':
          return 'bg-momcare-accent hover:bg-momcare-accent/90 text-white'; // Ensure accent color is defined in tailwind.config
        case 'outline':
          return 'border-momcare-primary/50 hover:text-momcare-primary hover:bg-momcare-primary/10';
        case 'default':
        default:
          return 'bg-momcare-primary hover:bg-momcare-dark text-white';
      }
    };

    return (
      <motion.div variants={itemVariants} key={video.id}>
        <Button
          size="lg"
          // Consistent styling with dynamic variant class
          className={`w-full text-base px-6 py-5 sm:py-6 flex items-center justify-center rounded-lg shadow hover:shadow-md transition-all duration-200 ${getVariantClass()}`}
          onClick={() => handlePlayVideo(video.id)}
          aria-label={`Play Video: ${video.title}`}
        >
          <PlayCircle aria-hidden="true" className="mr-2.5 h-5 w-5 flex-shrink-0" />
          <span className="truncate">{video.title}</span> {/* Use truncate for potentially long titles */}
        </Button>
        {/* Optional: Add description below button if available */}
        {/* {video.description && <p className="mt-2 text-sm text-gray-500">{video.description}</p>} */}
      </motion.div>
    );
  };

  // --- Main Render Logic ---

  return (
    <MainLayout>
      <motion.div
        key={selectedVideoId ? 'player' : 'selection'} // Key helps AnimatePresence track transitions
        className="container mx-auto flex min-h-[calc(100vh-160px)] flex-col items-center px-4 py-12 md:py-16" // Adjusted padding/min-height
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <AnimatePresence mode="wait"> {/* 'wait' ensures exit animation completes before enter */}
          {!selectedVideoInfo ? (
            // --- Button Selection View ---
            <motion.div
              key="selection-view"
              className="flex w-full max-w-3xl flex-grow flex-col items-center justify-center text-center"
              initial="hidden"
              animate="visible"
              exit="hidden" // Use hidden variant for exit animation
              variants={listVariants} // Apply stagger effect to children
            >
              <motion.div variants={itemVariants}> {/* Animate icon */}
                <Film
                  className="mb-6 h-16 w-16 text-momcare-primary/70 md:h-20 md:w-20"
                  strokeWidth={1.5}
                />
              </motion.div>
              <motion.h1
                className="mb-4 text-3xl font-bold text-gray-800 dark:text-gray-100 md:text-4xl"
                variants={itemVariants} // Animate heading
              >
                Support & Information Videos
              </motion.h1>
              <motion.p
                className="mb-10 text-gray-600 dark:text-gray-400 md:text-lg"
                variants={itemVariants} // Animate paragraph
              >
                Choose a topic below to watch the video.
              </motion.p>
              {/* Render buttons dynamically from data */}
              <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6">
                {supportVideosData.map(renderSelectionButton)}
              </div>
            </motion.div>
          ) : (
            // --- Video Player View ---
            <motion.div
              key="player-view"
              className="mt-6 flex w-full flex-col items-center gap-6"
              variants={playerVariants} // Use specific variants for player appearance
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 md:text-3xl">
                 {/* Use the title from the data object */}
                 Now Playing: {selectedVideoInfo.title}
              </h2>
              {/* Video player container with aspect ratio */}
              <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-lg border border-gray-300 bg-black shadow-xl dark:border-gray-700">
                <video
                  ref={videoRef}
                  key={selectedVideoInfo.id} // Key ensures video re-renders if source changes
                  className="h-full w-full"
                  // Construct source path relative to the public folder
                  src={`/${selectedVideoInfo.id}`} // Assumes videos are in /public/
                  controls // Show default browser controls
                  autoPlay // Attempt autoplay (might be blocked by browser)
                  playsInline // Important for iOS playback without fullscreen
                  aria-label={`Support video about ${selectedVideoInfo.title}`}
                  poster={selectedVideoInfo.thumbnailSrc} // Optional: Show thumbnail before load
                >
                  {/* Fallback content for browsers that don't support the video tag */}
                  <div className="p-4 text-center text-sm text-white">
                    <p className="mb-2">Your browser does not support the video tag.</p>
                    <p>You can download the video instead:</p>
                    <ul className="mt-2 list-none">
                       {/* Dynamically generate download links */}
                       {supportVideosData.map(video => (
                         <li key={`download-${video.id}`} className="inline-block px-2">
                            <a href={`/${video.id}`} download className="underline hover:text-gray-300">
                                Download: {video.title}
                            </a>
                         </li>
                       ))}
                    </ul>
                  </div>
                </video>
              </div>
              {/* Back Button */}
              <Button
                variant="outline"
                size="lg"
                className="mt-4 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-black dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                onClick={handleGoBack}
                aria-label="Go back to video selection"
              >
                <ChevronLeft aria-hidden="true" className="mr-2 h-5 w-5" />
                Back to Selection
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MainLayout>
  );
};

export default SupportVideoPage;