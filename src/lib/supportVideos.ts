// src/data/supportVideos.ts (Create this new file)

export interface SupportVideoInfo {
    id: string; // Using filename as a unique ID
    title: string;
    description?: string; // Optional: Add a short description if needed
    thumbnailSrc?: string; // Optional: Path to a thumbnail image
    buttonVariant?: 'default' | 'secondary' | 'accent' | 'outline'; // Optional: for styling buttons
  }
  
  export const supportVideosData: SupportVideoInfo[] = [
    {
      id: '1.mp4',
      title: 'Dexter and Doakes',
      description: 'A classic confrontation scene.', // Example description
      buttonVariant: 'default',
      // thumbnailSrc: '/thumbnails/dexter.jpg', // Example path
    },
    {
      id: '2.mp4',
      title: 'Arpit Bala FreeFire',
      description: 'Highlight reel of intense gameplay.', // Example description
      buttonVariant: 'secondary',
      // thumbnailSrc: '/thumbnails/arpit.jpg',
    },
    {
      id: '3.mp4',
      title: 'Akshay Kumar', // Updated title
      description: 'Iconic movie sequence.', // Example description
      buttonVariant: 'accent',
      // thumbnailSrc: '/thumbnails/rajini.jpg',
    },
    {
      id: '4.mp4',
      title: 'Dank Rishu', // Updated title
      description: 'Highlights from a popular roast video.', // Example description
      buttonVariant: 'outline',
      // thumbnailSrc: '/thumbnails/rishu.jpg',
    },
  ];