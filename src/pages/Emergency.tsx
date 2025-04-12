import React, { useState, useEffect, useCallback, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast'; // Assuming this hook exists and works
import {
  AlertTriangle, Phone, MapPin, Loader2, Hospital, RefreshCw, Navigation,
  HeartPulse, Siren, SearchX, MapPinned, Info, WifiOff, KeyRound, Ban,
  BriefcaseMedical, ClipboardList, LifeBuoy, Clock, Globe, PhoneCall
} from 'lucide-react';

// --- Constants ---
const GEOLOCATION_TIMEOUT = 30000; // 15 seconds
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-places-script";
const SEARCH_RADIUS_METERS = 20000; // 50km radius for location bias
const HOSPITAL_SEARCH_KEYWORD = 'hospital emergency room maternity labor delivery medical reputed'; // Keywords for Text Search
const MAX_SEARCH_RESULTS = 8; // Limit the number of results from the API

// --- Interfaces ---
interface LocationState { lat: number; lng: number; }

// --- State Enum ---
enum LoadingStatus {
  Idle,
  Locating,
  LoadingMaps,
  SearchingHospitals,
  Success,
  LocationError,
  MapsError, // Includes script load errors AND API errors like NOT_ACTIVATED/Key issues
  SearchError, // Specific errors during the search API call (e.g., INVALID_REQUEST)
  NoResults,
  ConfigError // API Key missing
}

// --- Skeleton Component ---
const HospitalSkeleton = () => (
    <Card className="border border-gray-200 shadow-sm rounded-lg overflow-hidden animate-pulse">
      <CardHeader className="p-4">
        <Skeleton className="h-5 w-3/4 mb-1.5 bg-gray-200" />
        <Skeleton className="h-4 w-full bg-gray-200" />
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-1/4 bg-gray-200" />
        <Skeleton className="h-5 w-1/3 bg-gray-200" />
        <Skeleton className="h-5 w-1/2 bg-gray-200" />
      </CardContent>
      <CardFooter className="p-4 bg-gray-100 border-t flex justify-between">
        <Skeleton className="h-9 w-24 bg-gray-300" />
        <Skeleton className="h-9 w-32 bg-gray-300" />
      </CardFooter>
    </Card>
  );


// --- Main Emergency Component ---
const Emergency = () => {
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
  // Use the specific Place type from google.maps
  const [hospitals, setHospitals] = useState<google.maps.places.Place[]>([]);
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.Idle);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const isMounted = useRef(true); // Ref to track component mount status
  const googleMapsApiKey = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY as string;
  const mapsApiLoaded = useRef(false); // Track if API script has successfully loaded Place class

  // --- Lifecycle and API Key Check ---
  useEffect(() => {
    isMounted.current = true; // Component did mount
    if (!googleMapsApiKey) {
      console.error("CRITICAL: Google Maps API Key (VITE_PUBLIC_GOOGLE_MAPS_API_KEY) is missing!");
      setErrorMessage("Map service configuration error. API Key is missing.");
      setStatus(LoadingStatus.ConfigError);
      toast({ title: "Config Error", description: "Maps API Key missing.", variant: "destructive" });
    } else {
      // Start location process only if key exists
      handleRequestLocation();
    }
    // Cleanup function runs on unmount
    return () => {
        isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount to check API Key

  // --- Geolocation Handling ---
  const handleRequestLocation = useCallback(() => {
    if (!isMounted.current) return; // Don't run if unmounted
    console.log("Requesting location...");
    setStatus(LoadingStatus.Locating);
    setErrorMessage(null);
    setCurrentLocation(null);
    setHospitals([]); // Clear previous results

    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      setErrorMessage("Geolocation is not supported by your browser.");
      setStatus(LoadingStatus.LocationError);
      return;
    }

    // Request current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMounted.current) return; // Check mount status again in async callback
        console.log("Location acquired:", position.coords);
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentLocation(newLocation);
        // Proceed to load maps script IF NOT ALREADY LOADED successfully
        if (!mapsApiLoaded.current) {
            handleLoadGoogleMaps();
        } else {
            console.log("Maps API already loaded, proceeding to search.");
            setStatus(LoadingStatus.SearchingHospitals); // If maps are ready, go straight to search
        }
      },
      (error) => {
        if (!isMounted.current) return; // Check mount status
        console.error("Geolocation error:", error.code, error.message);
        let message = "Unable to retrieve your location.";
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = "Location access denied. Please allow location access in your browser settings and refresh the page.";
                break;
            case error.POSITION_UNAVAILABLE:
                message = "Location information is currently unavailable. Please check your connection or try again later.";
                break;
            case error.TIMEOUT:
                message = "Location request timed out. Please check your network connection and try again.";
                break;
        }
        setErrorMessage(message);
        setStatus(LoadingStatus.LocationError);
      },
      // Options for geolocation request
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT, maximumAge: 0 } // Force fresh location
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsApiLoaded.current]); // Rerun if mapsApiLoaded status changes (though it's a ref, this dependency ensures logic runs if state depends on it)

  // --- Google Maps Script Loading ---
  const handleLoadGoogleMaps = useCallback(() => {
    if (!isMounted.current || !googleMapsApiKey || mapsApiLoaded.current) return; // Check mount, API key, and if already loaded

    // Check if the modern Place class is already available (e.g., loaded by another component)
    // Also check for the specific method we need: searchByText
    if (window.google?.maps?.places?.Place?.searchByText) {
      console.log("Google Maps script & Place.searchByText already available.");
      mapsApiLoaded.current = true; // Mark as loaded
      setStatus(LoadingStatus.SearchingHospitals); // Ready to search
      return;
    }

    // Check if the script tag already exists
    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
      console.log("Google Maps script tag exists, waiting for it to load/initialize...");
      setStatus(LoadingStatus.LoadingMaps);
      // Add a timeout fallback in case onload never fires or Place class fails to init
      const timeoutId = setTimeout(() => {
        if (isMounted.current && status === LoadingStatus.LoadingMaps && !window.google?.maps?.places?.Place?.searchByText) {
          console.error("Timeout waiting for existing Google Maps script to initialize Place.searchByText. Check API Key/Console.");
          setErrorMessage("Map service took too long to initialize. Check API Key setup in Google Cloud Console (ensure 'Places API (New)' is enabled) or network, then refresh.");
          setStatus(LoadingStatus.MapsError); // Use MapsError for API/Script issues
        }
      }, 15000); // Wait 15 seconds
      // Store timeout to clear it if onload fires correctly
      (window as any).googleMapsLoadTimeout = timeoutId;
      return;
    }

    console.log("Loading Google Maps script...");
    setStatus(LoadingStatus.LoadingMaps);
    setErrorMessage(null); // Clear previous errors

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    // Use libraries=places to load the Places library
    // Use loading=async for non-blocking load
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true; // Defer execution until HTML parsing is complete

    script.onload = () => {
      // Clear timeout fallback if it exists
      if ((window as any).googleMapsLoadTimeout) {
        clearTimeout((window as any).googleMapsLoadTimeout);
        delete (window as any).googleMapsLoadTimeout;
      }
      if (!isMounted.current) return;
      console.log("Google Maps script loaded via onload.");
      // CRITICAL CHECK: Verify Place class AND searchByText method exist AFTER onload
      if (window.google?.maps?.places?.Place?.searchByText) {
        console.log("Place.searchByText confirmed available after onload.");
        mapsApiLoaded.current = true; // Mark as loaded
        setStatus(LoadingStatus.SearchingHospitals); // Now ready to search
      } else {
        console.error("Place.searchByText method missing after script load event. CRITICAL: Check API Key, ensure 'Places API (New)' is ENABLED in Google Cloud Console, check restrictions, and check console for Google Maps specific errors.");
        setErrorMessage("Map service components failed to load. Ensure 'Places API (New)' is enabled in Google Cloud Console for your key, check restrictions, and then refresh.");
        setStatus(LoadingStatus.MapsError); // Use MapsError status
      }
    };

    script.onerror = (error) => {
       if ((window as any).googleMapsLoadTimeout) clearTimeout((window as any).googleMapsLoadTimeout); // Clear timeout on error too
      if (!isMounted.current) return;
      console.error("Failed to load Google Maps script:", error);
      setErrorMessage("Failed to load map service script. Check network connection or API key validity/restrictions.");
      setStatus(LoadingStatus.MapsError);
    };

    document.body.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsApiKey, status]); // Include status to potentially clear timeout

  // --- Google Places Search (Using searchByText with locationBias) ---
  const findNearbyHospitalsByText = useCallback(async () => {
     if (!isMounted.current || !currentLocation || status !== LoadingStatus.SearchingHospitals) {
         console.log("Search skipped. Conditions not met:", { isMounted: isMounted.current, currentLocation: !!currentLocation, status });
         return;
     }
    console.log(`Searching for nearby places using text query: "${HOSPITAL_SEARCH_KEYWORD}" biased near:`, currentLocation);

    // Robust check for Place class AND the specific search method availability
    if (!window.google?.maps?.places?.Place?.searchByText) {
      console.error("Place.searchByText method not available. Map service might be partially loaded or script failed. Check API Key/Console.");
      setErrorMessage("Map service components not ready. Ensure 'Places API (New)' is enabled in Google Cloud Console and refresh.");
      setStatus(LoadingStatus.MapsError);
      return;
    }

    // Use LatLngLiteral for type compatibility with locationBias center
    const locationCenter: google.maps.LatLngLiteral = { lat: currentLocation.lat, lng: currentLocation.lng };

    // Define the request for Place.searchByText
    // Ensure you have @types/google.maps installed for these types
    const request: google.maps.places.SearchByTextRequest = {
      textQuery: HOSPITAL_SEARCH_KEYWORD, // The keyword search term
      // Specify the fields you want in the results (camelCase)
      // Refer to Places API (New) docs for available fields and associated SKUs
      fields: [
        'id', // Essential for keys and map links
        'displayName', // Hospital name
        'formattedAddress', // Full address
        'location', // LatLngLiteral for positioning (if needed later for map markers)
        'rating', // Average user rating
        'userRatingCount', // Number of ratings
        'regularOpeningHours', // Request the object to check isOpen()
        'businessStatus', // e.g., OPERATIONAL, CLOSED_TEMPORARILY
        'websiteURI', // Official website
        'nationalPhoneNumber', // Local phone number
        'types', // To help filter/verify relevance
      ],
      // Use locationBias to prioritize results near the user
      // This biases results towards the area, but doesn't strictly exclude outside results.
      locationBias: {
        center: locationCenter,
        radius: SEARCH_RADIUS_METERS,
      },
      // If strict restriction is needed, calculate LatLngBoundsLiteral and use locationRestriction
      // locationRestriction: calculateBounds(locationCenter, SEARCH_RADIUS_METERS), // Example if needed
      maxResultCount: MAX_SEARCH_RESULTS, // Limit the number of results
      // Optional: Add language preference
      // language: 'en-US',
      // Optional: Add region bias (helps format addresses, e.g., 'in' for India)
      // region: 'in',
    };

    try {
        console.log("Sending searchByText request:", request);
        // Use Place.searchByText from the JS SDK
        // Ensure google.maps.places.Place is correctly typed if using @types/google.maps
        const { places } = await window.google.maps.places.Place.searchByText(request);

        if (!isMounted.current) return; // Check mount status after await

        console.log("searchByText results received:", places);

        if (places && places.length > 0) {
            // Filter results more robustly: ensure it has an ID and relevant type
            const validResults = places.filter(place =>
                place.id && // Must have an ID
                place.types?.some(type => ['hospital', 'health', 'doctor', 'clinic'].includes(type.toLowerCase())) // Check if any type matches common health terms (case-insensitive)
            );

            if (validResults.length > 0) {
                console.log("Filtered valid results:", validResults);
                setHospitals(validResults);
                setStatus(LoadingStatus.Success);
                setErrorMessage(null); // Clear any previous error message on success
            } else {
                 console.log("Initial results found, but none passed filtering criteria:", places);
                 setErrorMessage("No relevant hospitals found nearby matching the specific criteria (e.g., type). Try broadening search terms if needed.");
                 setStatus(LoadingStatus.NoResults);
                 setHospitals([]);
            }
        } else {
            setErrorMessage("No places found nearby matching the search query.");
            setStatus(LoadingStatus.NoResults);
            setHospitals([]);
        }
    } catch (error: any) {
        if (!isMounted.current) return; // Check mount status in catch block
        console.error("Error during Place.searchByText:", error);

        let userMessage = `Failed to find hospitals. Please try again later.`;
        let specificStatus = LoadingStatus.SearchError; // Default to general search error

        // Check for common Google Maps API error structures/messages
        // Note: JS SDK errors might not have standard 'code' properties like HTTP errors
        const errorMessageString = error?.message?.toLowerCase() || '';

        if (errorMessageString.includes('api_key_invalid') ||
            errorMessageString.includes('permission denied') ||
            errorMessageString.includes('apinotactivatedmaperror') || // Common error if API not enabled
            errorMessageString.includes('keyexpiredmaperror') ||
            errorMessageString.includes('keyinvalidmaperror'))
        {
             userMessage = "Map service error: API Key invalid, restricted, expired, or 'Places API (New)' not enabled in Google Cloud Console. Please check configuration.";
             specificStatus = LoadingStatus.MapsError; // Use MapsError for config/key issues
        } else if (errorMessageString.includes('zero_results')) {
             userMessage = "No places found nearby matching the search query.";
             specificStatus = LoadingStatus.NoResults;
        } else if (errorMessageString.includes('invalid_request')) {
             userMessage = "Map service request was invalid. Check parameters or search query.";
             specificStatus = LoadingStatus.SearchError;
        } else if (errorMessageString.includes('network error') || errorMessageString.includes('fetch')) {
             userMessage = "Network error while searching for hospitals. Please check your connection and try again.";
             specificStatus = LoadingStatus.SearchError; // Could also be MapsError depending on context
        }
        // Add more specific error checks if needed based on observed errors

        setErrorMessage(userMessage);
        setStatus(specificStatus);
        setHospitals([]);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, status, googleMapsApiKey]); // Dependencies for the search function

  // --- Effect to trigger search when status is ready ---
  useEffect(() => {
    // Trigger search only when location is available AND maps are ready (status indicates searching)
    if (status === LoadingStatus.SearchingHospitals && currentLocation && mapsApiLoaded.current) {
      // Double check Place.searchByText availability before calling search
      if (window.google?.maps?.places?.Place?.searchByText) {
          findNearbyHospitalsByText(); // Call the corrected search function
      } else {
          console.warn("Search triggered, but Place.searchByText still not ready. Waiting briefly...");
          // Optionally add a small delay and retry check, or rely on user refresh/next state change
          const checkAgain = setTimeout(() => {
              if (!isMounted.current) return;
              if (status === LoadingStatus.SearchingHospitals && !window.google?.maps?.places?.Place?.searchByText) {
                  console.error("Place.searchByText still not available after delay. Check API Key/Console.");
                  setErrorMessage("Map service failed to initialize properly. Ensure 'Places API (New)' is enabled and refresh.");
                  setStatus(LoadingStatus.MapsError);
              } else if (status === LoadingStatus.SearchingHospitals && currentLocation && mapsApiLoaded.current) {
                  // It might be ready now, try searching again if conditions still met
                  console.log("Retrying search after brief delay...");
                  findNearbyHospitalsByText();
              }
          }, 1500); // Check again after 1.5 seconds
          return () => clearTimeout(checkAgain); // Cleanup timeout
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentLocation, mapsApiLoaded.current, findNearbyHospitalsByText]); // Rerun when status, location, or maps loaded status changes, or search function ref changes

  // --- Helper to generate Google Maps link ---
  const generateMapLink = (placeId: string | undefined): string => {
    if (!placeId) return '#'; // Safe fallback
    // Use query_place_id for directing to a specific known place ID
    return `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;
  }

  // --- Render Hospital List Content ---
  const renderHospitalContent = () => {
    switch (status) {
        // Loading States
        case LoadingStatus.Idle:
            return <div className="flex flex-col items-center justify-center text-center flex-grow py-10"><p className="text-gray-500">Initializing...</p></div>;
        case LoadingStatus.Locating:
          return ( <div className="flex flex-col items-center justify-center text-center flex-grow py-10"><Loader2 className="h-10 w-10 animate-spin text-momcare-primary mb-4" /><p className="text-gray-600 font-medium">Getting your location...</p><p className="text-sm text-gray-500 mt-1">Please wait or allow location access.</p></div> );
        case LoadingStatus.LoadingMaps:
          return ( <div className="flex flex-col items-center justify-center text-center flex-grow py-10"><Loader2 className="h-10 w-10 animate-spin text-momcare-primary mb-4" /><p className="text-gray-600 font-medium">Loading map services...</p></div> );
        case LoadingStatus.SearchingHospitals:
          return ( <div className="space-y-4"><p className="text-center text-gray-600 font-medium mb-4">Finding nearby hospitals...</p>{[...Array(3)].map((_, i) => <HospitalSkeleton key={i} />)}</div> );

        // Error States
        case LoadingStatus.LocationError: case LoadingStatus.MapsError: case LoadingStatus.SearchError: case LoadingStatus.ConfigError:
          const ErrorIcon = status === LoadingStatus.LocationError ? Ban
                           : status === LoadingStatus.ConfigError ? KeyRound
                           : status === LoadingStatus.MapsError ? WifiOff // Or KeyRound if includes API key issues
                           : AlertTriangle; // General search error
          const errorTitle = status === LoadingStatus.ConfigError ? "Configuration Issue"
                           : status === LoadingStatus.LocationError ? "Location Error"
                           : status === LoadingStatus.MapsError ? "Map Service Error"
                           : "Search Error";
          return ( <div className="flex flex-col items-center justify-center text-center flex-grow py-10 bg-red-50 p-6 rounded-md border border-red-200"><ErrorIcon className="h-10 w-10 text-red-500 mb-4" /><p className="text-red-700 font-semibold mb-2">{errorTitle}</p><p className="text-red-600 text-sm mb-4 max-w-md">{errorMessage || "An unexpected error occurred."}</p>{status !== LoadingStatus.ConfigError && (<Button onClick={handleRequestLocation} variant="destructive" size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Try Again</Button>)}</div> );

        // No Results State
        case LoadingStatus.NoResults:
          return ( <div className="flex flex-col items-center justify-center text-center flex-grow py-10"><SearchX className="h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-600 font-medium mb-2">No Nearby Hospitals Found</p><p className="text-gray-500 text-sm mb-4 max-w-md">{errorMessage || "We couldn't find relevant hospitals near your location matching the search criteria."}</p><Button onClick={handleRequestLocation} variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Refresh Search</Button></div> );

        // Success State
        case LoadingStatus.Success:
          return (
            <div className="space-y-5">
              <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="font-medium text-blue-900">Opening Hours Note</AlertTitle>
                  <AlertDescription className="text-xs">
                    "Open Now" status reflects general hours from Google. Emergency Room availability may differ and can change rapidly.
                    <strong className="block mt-1">Please call the hospital directly if possible to confirm ER status, capacity, and specific maternal care services before traveling.</strong>
                  </AlertDescription>
              </Alert>
              
              {hospitals.map((hospital) => {
                // Extract data using modern field names (camelCase) from the Place object
                const placeId = hospital.id;
                const name = hospital.displayName;
                const address = hospital.formattedAddress;
                // Check if regularOpeningHours exists and call isOpen()
                // The isOpen() method might not exist if opening hours data isn't available for the place
                // or if the 'regularOpeningHours' field wasn't requested/returned successfully.
                const isOpenNow = hospital.regularOpeningHours 
                  ? (hospital.regularOpeningHours as any).isOpenNow?.() || 
                    (hospital.regularOpeningHours as any).isOpen?.()
                  : undefined;

                const rating = hospital.rating; // number | undefined
                const userRatingCount = hospital.userRatingCount; // number | undefined
                // Format business status nicely (e.g., 'OPERATIONAL' -> 'operational')
                const statusText = hospital.businessStatus?.replace(/_/g, ' ').toLowerCase(); // string | undefined
                const website = hospital.websiteURI; // string | undefined
                const phone = hospital.nationalPhoneNumber; // string | undefined

                return (
                    <Card key={placeId} className="border border-gray-200 shadow-sm rounded-lg overflow-hidden transition-shadow hover:shadow-md">
                       <CardHeader className="p-4">
                         <CardTitle className="text-base font-semibold text-momcare-primary">{name || 'Hospital Name Unavailable'}</CardTitle>
                         {address && (<CardDescription className="text-xs text-gray-500 mt-0.5 flex items-start"><MapPin className="h-3 w-3 mr-1 flex-shrink-0 mt-px" />{address}</CardDescription>)}
                       </CardHeader>
                       <CardContent className="p-4 pt-0 space-y-2">
                         {/* Badges Row */}
                         <div className="flex flex-wrap gap-2 items-center mb-2">
                             {/* Display Open Status */}
                             {isOpenNow !== undefined && (
                                <Badge
                                    variant={isOpenNow ? "default" : "destructive"}
                                    className={`text-xs font-medium ${isOpenNow
                                        ? 'bg-green-100 text-green-800 border-green-200'
                                        : 'bg-red-100 text-red-800 border-red-200'
                                    }`}
                                >
                                   {isOpenNow ? "Open Now (General)" : "Likely Closed (General)"}
                                </Badge>
                             )}
                             {/* Display Rating */}
                             {typeof rating === 'number' && rating > 0 && (
                                <Badge variant="secondary" className="text-xs font-medium bg-yellow-100 text-yellow-800 border-yellow-200">
                                    {rating.toFixed(1)} ★ {typeof userRatingCount === 'number' ? `(${userRatingCount} ratings)` : ''}
                                </Badge>
                             )}
                             {/* Display Business Status */}
                             {statusText && statusText !== 'operational' && ( // Show status if not 'operational'
                                <Badge variant="outline" className="text-xs capitalize border-orange-300 bg-orange-50 text-orange-800">
                                    {statusText}
                                </Badge>
                             )}
                         </div>
                         {/* Contact Info Row */}
                         <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                            {phone && (
                                <a href={`tel:${phone}`} className="flex items-center hover:text-momcare-primary hover:underline focus:outline-none focus:ring-1 focus:ring-momcare-primary rounded">
                                    <PhoneCall className="h-3.5 w-3.5 mr-1" /> {phone}
                                </a>
                            )}
                            {website && (
                                <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-momcare-primary hover:underline focus:outline-none focus:ring-1 focus:ring-momcare-primary rounded">
                                    <Globe className="h-3.5 w-3.5 mr-1" /> Website
                                </a>
                            )}
                         </div>
                       </CardContent>
                       <CardFooter className="p-4 bg-gray-50/70 border-t">
                           {/* Button to get directions */}
                           <Button asChild size="sm" className="bg-momcare-primary hover:bg-momcare-dark text-white" disabled={!placeId}>
                             <a
                               href={generateMapLink(placeId)} // Use the helper
                               target="_blank" // Open in new tab
                               rel="noopener noreferrer" // Security best practice
                               aria-label={`Get directions to ${name || 'this hospital'}`}
                               onClick={(e) => !placeId && e.preventDefault()} // Prevent click if no ID
                               className={!placeId ? 'opacity-50 cursor-not-allowed' : ''}
                             >
                               <Navigation className="mr-1.5 h-4 w-4" /> Get Directions
                             </a>
                           </Button>
                       </CardFooter>
                    </Card>
                );
              })}
               {/* Refresh button at the bottom */}
               <div className="mt-6 flex justify-center border-t pt-5">
                   <Button onClick={handleRequestLocation} variant="outline" size="sm">
                       <RefreshCw className="mr-2 h-4 w-4" /> Refresh Hospital List
                   </Button>
               </div>
            </div>
          );
        // Default case
        default:
            return <p className="text-center py-10 text-gray-500">Loading state...</p>;
      }
  };

  // --- JSX Structure (Main component render) ---
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-momcare-primary sm:text-5xl tracking-tight">Emergency Support</h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">Critical contacts, urgent warning signs, and help finding nearby medical facilities when you need them most.</p>
        </div>

        {/* Top Emergency Alert */}
        <Alert variant="destructive" className="mb-12 border-2 border-red-600 bg-red-50 p-6 rounded-lg shadow-xl flex items-start">
          <Siren className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
          <div className="ml-4">
            <AlertTitle className="text-red-800 font-bold text-2xl">Medical Emergency? Act Immediately!</AlertTitle>
            <AlertDescription className="text-red-700 font-medium mt-2 text-base">
              This page provides helpful information, but <strong>it is NOT a substitute for emergency services.</strong> If you suspect a medical emergency for yourself or your baby, <strong>call 102 (or your local emergency number) right away.</strong>
            </AlertDescription>
          </div>
        </Alert>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-start">

          {/* Column 1: Contacts & What to Do */}
          <div className="lg:col-span-1 space-y-8">
            {/* Contacts Card */}
            <Card className="border-red-200 border shadow-lg rounded-lg overflow-hidden">
              <CardHeader className="bg-red-50 p-5"><CardTitle className="flex items-center text-xl font-semibold text-red-700"><Phone className="mr-3 h-6 w-6" />Emergency Contacts</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-5">
                 <div className="flex items-center justify-between border-b pb-4">
                    <div><h3 className="font-semibold text-gray-800 text-base">Ambulance / Medical</h3><p className="text-2xl font-bold text-red-600 tracking-wider">102</p></div>
                    <Button asChild variant="destructive" size="sm"><a href="tel:102" aria-label="Call Emergency Services 102"><Phone className="mr-1.5 h-4 w-4" /> Call Now</a></Button>
                 </div>
                 <div className="flex items-center justify-between border-b pb-4">
                    <div><h3 className="font-semibold text-gray-800 text-base">Pregnancy Support</h3><p className="text-lg font-bold text-momcare-primary">0444-631-4300</p><p className="text-xs text-gray-500">(Check local availability)</p></div>
                    <Button asChild variant="outline" size="sm" className="border-momcare-primary text-momcare-primary hover:bg-momcare-light hover:text-momcare-primary"><a href="tel:04446314300" aria-label="Call Pregnancy Support Hotline"><HeartPulse className="mr-1.5 h-4 w-4" /> Call Support</a></Button>
                 </div>
                 <div>
                    <h3 className="font-semibold text-gray-800 text-base">Other Useful Numbers</h3>
                    <p className="text-sm text-gray-500 mt-1">Consider adding local Poison Control or non-emergency police numbers here if relevant.</p>
                 </div>
              </CardContent>
            </Card>

            {/* What to Do Card */}
            <Card className="border-blue-200 border shadow-lg rounded-lg overflow-hidden">
                <CardHeader className="bg-blue-50 p-5"><CardTitle className="flex items-center text-xl font-semibold text-blue-700"><ClipboardList className="mr-3 h-6 w-6" />In Case of Emergency</CardTitle></CardHeader>
                <CardContent className="p-6">
                    <ol className="space-y-3 text-sm list-decimal list-outside pl-5 text-gray-700">
                        <li><strong>Stay Calm:</strong> Take deep breaths. Panic can make things worse.</li>
                        <li><strong>Call for Help:</strong> Dial 102 or your local emergency number immediately. Clearly state your emergency.</li>
                        <li><strong>Provide Information:</strong> Tell the operator your location, symptoms, how many weeks pregnant you are, and any known medical conditions.</li>
                        <li><strong>Don't Drive Yourself:</strong> If possible, have someone else drive you or wait for the ambulance.</li>
                        <li><strong>Contact Support:</strong> Notify your partner, family member, or support person.</li>
                        <li><strong>Medical Info:</strong> Have your medical records, ID, and insurance information ready if possible.</li>
                        <li><strong>Follow Instructions:</strong> Listen carefully to the emergency operator and medical personnel.</li>
                    </ol>
                </CardContent>
            </Card>
          </div>

          {/* Column 2: Warning Signs & Preparedness */}
          <div className="lg:col-span-2 space-y-8">
            {/* Warning Signs Card with Accordion */}
            <Card className="border-amber-200 border shadow-lg rounded-lg overflow-hidden">
              <CardHeader className="bg-amber-50 p-5"><CardTitle className="flex items-center text-xl font-semibold text-amber-700"><Info className="mr-3 h-6 w-6" />Urgent Pregnancy Warning Signs</CardTitle><CardDescription className="text-amber-600 text-sm pt-1">Seek immediate medical attention if you experience any of these.</CardDescription></CardHeader>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {/* Preeclampsia Signs */}
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-base font-medium hover:no-underline">Signs of Preeclampsia / High Blood Pressure</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2 pt-2">
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Severe Headache:</strong> Persistent, doesn't improve with rest/medication.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Vision Changes:</strong> Blurred vision, seeing spots/flashing lights, sensitivity to light.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Severe Swelling:</strong> Sudden swelling, especially in the face, hands, or feet (more than usual pregnancy swelling).</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Upper Abdominal Pain:</strong> Pain under the ribs, usually on the right side.</span></p>
                      <p className="text-xs text-gray-600 italic mt-1">Why it's urgent: Preeclampsia is a serious condition affecting blood pressure and organs, potentially dangerous for both mother and baby if untreated.</p>
                    </AccordionContent>
                  </AccordionItem>
                  {/* Preterm Labor Signs */}
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-base font-medium hover:no-underline">Signs of Preterm Labor (Before 37 Weeks)</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2 pt-2">
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Regular Contractions:</strong> More than 4-6 in an hour, may feel like tightening or period cramps.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Water Breaking:</strong> A gush or continuous trickle of fluid from the vagina.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Pelvic Pressure:</strong> Feeling like the baby is pushing down.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Low, Dull Backache:</strong> Constant or comes and goes.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Change in Vaginal Discharge:</strong> Increase in amount, or becoming watery, mucus-like, or bloody.</span></p>
                      <p className="text-xs text-gray-600 italic mt-1">Why it's urgent: Starting labor too early requires medical intervention to potentially stop it or prepare for an early birth.</p>
                    </AccordionContent>
                  </AccordionItem>
                  {/* Bleeding Signs */}
                   <AccordionItem value="item-3">
                    <AccordionTrigger className="text-base font-medium hover:no-underline">Bleeding Issues</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2 pt-2">
                       <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Heavy Vaginal Bleeding:</strong> Soaking through a pad in an hour, with or without pain.</span></p>
                       <p className="text-xs text-gray-600 italic mt-1">Why it's urgent: Significant bleeding can indicate serious problems like placental abruption or placenta previa.</p>
                    </AccordionContent>
                  </AccordionItem>
                  {/* Other Urgent Signs */}
                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-base font-medium hover:no-underline">Other Urgent Concerns</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2 pt-2">
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Decreased Fetal Movement:</strong> Significant reduction or absence of baby's kicks/movements (follow doctor's advice on kick counts).</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>High Fever:</strong> Temperature over 100.4°F (38°C) that doesn't come down.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Severe Abdominal Pain:</strong> Intense, persistent pain not relieved by changing position.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Difficulty Breathing / Chest Pain:</strong> Shortness of breath worse than usual pregnancy breathlessness, or any chest pain.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Persistent Vomiting:</strong> Unable to keep fluids down for more than 12-24 hours.</span></p>
                      <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Thoughts of Harming Yourself or Baby:</strong> Seek immediate help from emergency services or a mental health crisis line.</span></p>
                      <p className="text-xs text-gray-600 italic mt-1">Why it's urgent: These signs can indicate infection, fetal distress, dehydration, blood clots, or other serious conditions requiring prompt evaluation.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

             {/* Emergency Preparedness Card */}
            <Card className="border-green-200 border shadow-lg rounded-lg overflow-hidden">
                <CardHeader className="bg-green-50 p-5"><CardTitle className="flex items-center text-xl font-semibold text-green-700"><BriefcaseMedical className="mr-3 h-6 w-6" />Emergency Preparedness</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div>
                        <h3 className="font-semibold text-base text-gray-800 mb-2">Prepare a "Go-Bag":</h3>
                        <ul className="space-y-1.5 text-sm list-disc list-outside pl-5 text-gray-700">
                            <li>Important documents (ID, insurance card, hospital pre-registration forms).</li>
                            <li>Copy of your prenatal records (ask your doctor).</li>
                            <li>List of current medications and allergies.</li>
                            <li>Phone and charger.</li>
                            <li>Comfortable clothes, basic toiletries.</li>
                            <li>Snacks and water (check hospital policy).</li>
                            <li>Eyeglasses/contacts if needed.</li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="font-semibold text-base text-gray-800 mb-2">Keep Information Handy:</h3>
                        <ul className="space-y-1.5 text-sm list-disc list-outside pl-5 text-gray-700">
                            <li>Doctor's and hospital's phone numbers.</li>
                            <li>Emergency contact numbers.</li>
                            <li>Your blood type (if known).</li>
                            <li>Brief medical history summary.</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>

        {/* Nearby Hospitals Card */}
        <Card className="border-gray-200 border shadow-lg rounded-lg overflow-hidden mb-12">
          <CardHeader className="bg-gray-50 p-5 border-b">
            <CardTitle className="flex items-center text-xl font-semibold text-gray-800"><MapPinned className="mr-3 h-6 w-6 text-momcare-primary" />Nearby Hospitals with Emergency/Maternity Focus</CardTitle>
            <CardDescription className="mt-1 text-sm text-gray-600">Showing relevant facilities near your current location based on your search for "hospital emergency room maternity labor delivery". Data provided by Google Maps. <b>Always call 102 in a true emergency.</b></CardDescription>
            {/* Add a note about API Key issues if applicable */}
            {status === LoadingStatus.MapsError && errorMessage?.includes("Google Cloud Console") && (
                 <Alert variant="destructive" className="mt-4 text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Action Required: Map Service Error</AlertTitle>
                    <AlertDescription>
                        The map service failed. Please ensure the <strong>Places API (New)</strong> is enabled in your Google Cloud Console project for the API key being used, and check API key restrictions (HTTP referrers, API restrictions). Then, refresh the page.
                    </AlertDescription>
                 </Alert>
            )}
             {status === LoadingStatus.ConfigError && (
                 <Alert variant="destructive" className="mt-4 text-xs">
                    <KeyRound className="h-4 w-4" />
                    <AlertTitle>Action Required: Configuration Error</AlertTitle>
                    <AlertDescription>
                        The Google Maps API Key is missing. Please ensure the `VITE_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable is set correctly.
                    </AlertDescription>
                 </Alert>
            )}
          </CardHeader>
          <CardContent className="p-6 min-h-[300px] flex flex-col">
            {/* Render dynamic content based on status */}
            {renderHospitalContent()}
          </CardContent>
        </Card>

        {/* Disclaimer Section */}
         <Card className="border-gray-300 border-dashed bg-gray-50 mb-12">
            <CardHeader className="p-5"><CardTitle className="flex items-center text-lg font-semibold text-gray-700"><LifeBuoy className="mr-3 h-5 w-5" />Important Disclaimer</CardTitle></CardHeader>
            <CardContent className="p-5 pt-0 text-sm text-gray-600 space-y-2">
                <p>This page provides general information and tools for emergency preparedness during pregnancy. It is <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment.</p>
                <p>Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. <strong>Never disregard professional medical advice or delay in seeking it because of something you have read on this application.</strong></p>
                <p>In case of a medical emergency, call your local emergency number (like 102) immediately.</p>
                <p>Hospital information (including opening hours, ratings, status, phone, and website) is provided by Google Maps and may not always be completely up-to-date or reflect specific Emergency Room or Maternity Ward availability, capabilities, or capacity. **Verify critical information directly with the hospital if possible, especially regarding ER status and capacity, before traveling.**</p>
            </CardContent>
         </Card>

        {/* Final CTA */}
        <div className="bg-gradient-to-r from-momcare-light to-white rounded-lg p-8 text-center border border-momcare-primary/20 shadow-md">
          <h2 className="text-2xl font-bold text-momcare-primary mb-3">Have Non-Urgent Questions?</h2>
          <p className="mb-6 text-gray-700 max-w-xl mx-auto">Our AI assistant is available 24/7 for general pregnancy information and support. Remember, it's not a substitute for professional medical advice.</p>
          <Button asChild size="lg" className="bg-momcare-primary hover:bg-momcare-dark text-base px-8 py-3"><a href="/chat">Chat with MomCare AI</a></Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Emergency;