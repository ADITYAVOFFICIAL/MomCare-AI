
/**
 * Loads the Google Maps JavaScript API dynamically
 * @param apiKey - Google Maps API key
 * @param callback - Function to call when API is loaded
 */
export const loadGoogleMapsScript = (apiKey: string, callback: () => void): void => {
  // If Google Maps API is already loaded, call the callback and return
  if (window.google && window.google.maps) {
    callback();
    return;
  }

  // Create a global callback function
  const callbackName = `googleMapsCallback_${Math.random().toString(36).substr(2, 9)}`;
  window[callbackName] = callback;

  // Create script element
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
  script.async = true;
  script.defer = true;
  
  // Add error handling
  script.onerror = () => {
    console.error("Error loading Google Maps API");
    delete window[callbackName];
  };

  // Append the script to the document
  document.body.appendChild(script);
};

/**
 * Generates a Google Maps search link using place ID
 * @param placeId - Google Maps place ID
 * @returns URL to Google Maps
 */
export const generateMapLink = (placeId: string): string => 
  `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;

/**
 * Define Google Maps related types to avoid TypeScript errors
 */
export const initGoogleMapsTypes = (): void => {
  if (!window.google) {
    window.google = {} as any;
  }
};
