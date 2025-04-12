// src/pages/SupportVideoPage.tsx

import React, { useState, useRef, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout'; // Adjust path if needed
import { Button } from '@/components/ui/button'; // Adjust path if needed
import { PlayCircle, Film, ChevronLeft } from 'lucide-react'; // Icons for buttons

// Helper function to extract video number from filename
const getVideoNumber = (filename: string | null): string => {
    if (!filename) return '';
    const match = filename.match(/^(\d+)\.mp4$/);
    return match ? match[1] : '';
};

const SupportVideoPage = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayVideo = (videoFileName: string) => {
    setSelectedVideo(videoFileName);
  };

  const handleGoBack = () => {
    setSelectedVideo(null);
  };

  useEffect(() => {
    if (selectedVideo && videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      videoRef.current.play().catch(error => {
        console.warn("Video autoplay prevented:", error);
      });
    }
  }, [selectedVideo]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 flex flex-col items-center min-h-[calc(100vh-150px)]"> {/* Adjust min-height */}

        {!selectedVideo ? (
          // --- Button Selection View ---
          <div className="flex flex-col items-center justify-center text-center flex-grow w-full max-w-2xl"> {/* Increased max-width slightly */}
            <Film className="w-16 h-16 text-momcare-primary/70 mb-6" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Support & Information Videos
            </h1>
            <p className="text-gray-600 mb-10"> {/* Increased bottom margin */}
              Choose a video below to learn more.
            </p>
            {/* Use a Grid layout for 4 buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full"> {/* Changed to grid */}
              <Button
                size="lg"
                className="w-full bg-momcare-primary hover:bg-momcare-dark text-base px-6 py-6 flex items-center justify-center" // Adjusted padding, added flex centering
                onClick={() => handlePlayVideo('1.mp4')}
                aria-label="Play Support Video 1"
              >
                <PlayCircle className="mr-2 h-5 w-5 flex-shrink-0" /> {/* Added flex-shrink-0 */}
                <span>Watch Video 1</span> {/* Wrapped text in span */}
              </Button>
              <Button
                size="lg"
                className="w-full bg-momcare-secondary hover:bg-momcare-secondary/90 text-base px-6 py-6 flex items-center justify-center" // Use secondary color
                onClick={() => handlePlayVideo('2.mp4')}
                aria-label="Play Support Video 2"
              >
                <PlayCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>Watch Video 2</span>
              </Button>
              <Button
                size="lg"
                className="w-full bg-momcare-accent hover:bg-momcare-accent/90 text-base px-6 py-6 flex items-center justify-center" // Use accent color (adjust if needed)
                onClick={() => handlePlayVideo('3.mp4')}
                aria-label="Play Support Video 3"
              >
                <PlayCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>Watch Video 3</span>
              </Button>
              <Button
                size="lg"
                variant="outline" // Use outline for the fourth button for visual variety
                className="w-full border-momcare-primary/50 text-momcare-primary hover:bg-momcare-light/50 hover:text-momcare-primary text-base px-6 py-6 flex items-center justify-center"
                onClick={() => handlePlayVideo('4.mp4')}
                aria-label="Play Support Video 4"
              >
                <PlayCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>Watch Video 4</span>
              </Button>
            </div>
          </div>
        ) : (
          // --- Video Player View ---
          <div className="w-full flex flex-col items-center gap-6 mt-6">
             <h2 className="text-2xl font-semibold text-gray-800">
                {/* Use helper function for dynamic title */}
                Now Playing: Video {getVideoNumber(selectedVideo)}
             </h2>
            <div className="w-full max-w-4xl aspect-video bg-black rounded-lg shadow-xl overflow-hidden border border-gray-300"> {/* Added subtle border */}
              <video
                ref={videoRef}
                key={selectedVideo}
                className="w-full h-full"
                src={`/${selectedVideo}`} // Path relative to public folder
                controls
                autoPlay
                playsInline
                aria-label={`Support video ${getVideoNumber(selectedVideo)}`}
              >
                Your browser does not support the video tag.
                <p className="p-4 text-white text-sm">
                  You can download the video instead: <br />
                  <a href="/1.mp4" download className="underline ml-2">Download Video 1</a> |
                  <a href="/2.mp4" download className="underline ml-2">Download Video 2</a> |
                  <a href="/3.mp4" download className="underline ml-2">Download Video 3</a> |
                  <a href="/4.mp4" download className="underline ml-2">Download Video 4</a>
                </p>
              </video>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="mt-4 border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={handleGoBack}
              aria-label="Go back to video selection"
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Back to Selection
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SupportVideoPage;