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
  BriefcaseMedical, ClipboardList, LifeBuoy, Clock, Globe, PhoneCall, Route,
  Search
} from 'lucide-react';

// --- Constants ---
const GEOLOCATION_TIMEOUT = 20000; // Slightly reduced timeout
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-places-script";
const SEARCH_RADIUS_METERS = 50000; // 50km radius for location bias
const HOSPITAL_SEARCH_KEYWORD = 'hospital emergency room maternity labor delivery medical reputed';
const MAX_SEARCH_RESULTS = 10;

// --- Interfaces ---
interface LocationState { lat: number; lng: number; }

// --- State Enum ---
enum LoadingStatus {
  Idle,             // Initial state before API key check
  ConfigError,      // API Key missing
  PreLoad,          // API Key ok, starting background loads (Maps)
  LoadingMaps,      // Maps script is actively loading
  Ready,            // Maps loaded, ready for user interaction (button click)
  Locating,         // Geolocation in progress (triggered by button)
  SearchingHospitals,// Places API search in progress
  Success,          // Search successful, results displayed
  LocationError,    // Geolocation failed
  MapsError,        // Maps script load/init failed
  SearchError,      // Places API search failed
  NoResults         // Places API search returned no results
}

// --- Haversine Distance Calculation ---
function calculateDistance(loc1: LocationState, loc2: LocationState): number | null {
    if (!loc1 || !loc2) return null;
    const R = 6371; // km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const lat1Rad = loc1.lat * Math.PI / 180;
    const lat2Rad = loc2.lat * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
  const [hospitals, setHospitals] = useState<google.maps.places.Place[]>([]);
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.Idle);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHospitalsRequested, setShowHospitalsRequested] = useState<boolean>(false);
  const { toast } = useToast();
  const isMounted = useRef(true);
  const googleMapsApiKey = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY as string;
  const mapsApiLoaded = useRef(false);
  const mapsLoadInitiated = useRef(false); // Track if script load has been started

  // --- Lifecycle and API Key Check / Initial Maps Load ---
  useEffect(() => {
    isMounted.current = true;
    if (!googleMapsApiKey) {
      setErrorMessage("Map service configuration error. API Key is missing.");
      setStatus(LoadingStatus.ConfigError);
      toast({ title: "Config Error", description: "Maps API Key missing.", variant: "destructive" });
    } else {
      // API Key exists, start loading maps in background if not already initiated
      setStatus(LoadingStatus.PreLoad); // Indicate we are ready to start background tasks
      if (!mapsLoadInitiated.current) {
        handleLoadGoogleMaps(); // Start loading maps immediately
        mapsLoadInitiated.current = true;
      }
    }
    return () => { isMounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsApiKey]); // Run only once on mount or if API key changes

  // --- Google Maps Script Loading (Can be called on mount or retry) ---
  const handleLoadGoogleMaps = useCallback(() => {
    // console.log("handleLoadGoogleMaps called", { isMounted: isMounted.current, googleMapsApiKey: !!googleMapsApiKey, mapsApiLoaded: mapsApiLoaded.current });
    // Prevent loading if already loaded, no key, or component unmounted
    if (!isMounted.current || !googleMapsApiKey || mapsApiLoaded.current) return;

    // Check if the specific API we need is already available (might have loaded between checks)
    if (window.google?.maps?.places?.Place?.searchByText) {
      // console.log("Google Maps script & Place.searchByText already available.");
      mapsApiLoaded.current = true;
      // If maps just finished loading, transition to Ready state
      if (status === LoadingStatus.LoadingMaps || status === LoadingStatus.PreLoad) {
        setStatus(LoadingStatus.Ready);
      }
      return;
    }

    // If script tag exists, assume it's loading or failed, wait for callback/timeout
    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
       // console.log("Google Maps script tag exists, waiting for it to load/initialize...");
       // Ensure status reflects loading state if we are in PreLoad
       if (status === LoadingStatus.PreLoad) {
           setStatus(LoadingStatus.LoadingMaps);
       }
       // Add a timeout fallback in case onload never fires
       const timeoutId = setTimeout(() => {
         if (isMounted.current && status === LoadingStatus.LoadingMaps && !window.google?.maps?.places?.Place?.searchByText) {
           setErrorMessage("Map service took too long to initialize. Check API Key setup (Places API (New) enabled) or network, then refresh.");
           setStatus(LoadingStatus.MapsError);
           // No need to reset showHospitalsRequested here as it handles errors gracefully
         }
       }, 15000); // 15 second timeout
       (window as any).googleMapsLoadTimeout = timeoutId;
       return;
    }

    // console.log("Loading Google Maps script...");
    // Set status to LoadingMaps only if it wasn't already (e.g., from PreLoad)
    if (status !== LoadingStatus.LoadingMaps) {
        setStatus(LoadingStatus.LoadingMaps);
    }
    setErrorMessage(null);

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&loading=async&callback=initMap`;
    script.async = true;
    script.defer = true;

    // Define the global callback function
    (window as any).initMap = () => {
        // console.log("Google Maps script loaded via initMap callback.");
        if ((window as any).googleMapsLoadTimeout) clearTimeout((window as any).googleMapsLoadTimeout);
        delete (window as any).googleMapsLoadTimeout;
        if (!isMounted.current) return;

        if (window.google?.maps?.places?.Place?.searchByText) {
            // console.log("Place.searchByText confirmed available after initMap.");
            mapsApiLoaded.current = true;
            // Maps are ready. Now check if user has already clicked the button AND location is ready
            if (showHospitalsRequested && currentLocation) {
                setStatus(LoadingStatus.SearchingHospitals); // Trigger search immediately
            } else {
                setStatus(LoadingStatus.Ready); // Maps ready, wait for user action or location
            }
        } else {
            // console.error("Place.searchByText method missing after initMap. CRITICAL: Check API Key, 'Places API (New)' ENABLED, restrictions, console errors.");
            setErrorMessage("Map service components failed to load. Ensure 'Places API (New)' is enabled in Google Cloud Console, check restrictions, and refresh.");
            setStatus(LoadingStatus.MapsError);
        }
    };

    script.onerror = (error) => {
       if ((window as any).googleMapsLoadTimeout) clearTimeout((window as any).googleMapsLoadTimeout);
       delete (window as any).googleMapsLoadTimeout;
       delete (window as any).initMap; // Clean up callback reference
      if (!isMounted.current) return;
      setErrorMessage("Failed to load map service script. Check network connection or API key validity/restrictions.");
      setStatus(LoadingStatus.MapsError);
    };

    document.body.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsApiKey, status, currentLocation, showHospitalsRequested]); // Include dependencies that might influence state transition after load

  // --- Geolocation Handling (Triggered by user click) ---
  const handleRequestLocation = useCallback(() => {
    if (!isMounted.current || status === LoadingStatus.Locating) return;

    // console.log("Requesting location (triggered by user)...");
    setStatus(LoadingStatus.Locating);
    setErrorMessage(null);
    setCurrentLocation(null); // Reset location before getting a new one

    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      setStatus(LoadingStatus.LocationError);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMounted.current) return;
        // console.log("Location acquired:", position.coords);
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentLocation(newLocation);

        // Location acquired. Check if maps are ready to proceed to search.
        if (mapsApiLoaded.current) {
            setStatus(LoadingStatus.SearchingHospitals); // Both ready, start search
        } else {
            // Maps not ready yet. The maps load callback (initMap) will handle
            // transitioning to SearchingHospitals once maps are loaded.
            // Stay in Locating or move to LoadingMaps if that's the current state.
            // If maps failed previously, stay in MapsError.
            if (status !== LoadingStatus.MapsError) {
                 setStatus(LoadingStatus.LoadingMaps); // Indicate we're now waiting for maps
            }
        }
      },
      (error) => {
        if (!isMounted.current) return;
        // console.error("Geolocation error:", error.code, error.message);
        let message = "Unable to retrieve your location.";
        switch (error.code) {
            case error.PERMISSION_DENIED: message = "Location access denied. Please allow location access and try again."; break;
            case error.POSITION_UNAVAILABLE: message = "Location information unavailable. Check connection/try again."; break;
            case error.TIMEOUT: message = "Location request timed out. Check network/try again."; break;
        }
        setErrorMessage(message);
        setStatus(LoadingStatus.LocationError);
        // Reset request flag implicitly because the button remains clickable on error
      },
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT, maximumAge: 0 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Depends on status to prevent re-entry

  // --- Google Places Search ---
  const findNearbyHospitalsByText = useCallback(async () => {
     if (!isMounted.current || !currentLocation || status !== LoadingStatus.SearchingHospitals || !mapsApiLoaded.current) {
         return;
     }
    // console.log(`Searching for nearby places...`);

    if (!window.google?.maps?.places?.Place?.searchByText) {
      setErrorMessage("Map service components not ready. Ensure 'Places API (New)' is enabled and refresh.");
      setStatus(LoadingStatus.MapsError);
      return;
    }

    const locationCenter: google.maps.LatLngLiteral = { lat: currentLocation.lat, lng: currentLocation.lng };
    const request: google.maps.places.SearchByTextRequest = {
      textQuery: HOSPITAL_SEARCH_KEYWORD,
      fields: [
        'id', 'displayName', 'formattedAddress', 'location', 'rating',
        'userRatingCount', 'regularOpeningHours', 'businessStatus', // regularOpeningHours needed for isOpen()
        'websiteURI', 'nationalPhoneNumber', 'types',
      ],
      locationBias: { center: locationCenter, radius: SEARCH_RADIUS_METERS },
      maxResultCount: MAX_SEARCH_RESULTS,
    };

    try {
        // console.log("Sending searchByText request:", request);
        const { places } = await window.google.maps.places.Place.searchByText(request);
        if (!isMounted.current) return;

        if (places && places.length > 0) {
            const validResults = places.filter(place =>
                place.id && place.location &&
                place.types?.some(type => ['hospital', 'health', 'doctor', 'clinic'].includes(type.toLowerCase()))
            );

            if (validResults.length > 0) {
                const sortedResults = validResults
                    .map(place => ({
                        place,
                        distanceKm: calculateDistance(currentLocation, { lat: place.location!.lat(), lng: place.location!.lng() })
                    }))
                    .filter(item => item.distanceKm !== null)
                    .sort((a, b) => a.distanceKm! - b.distanceKm!)
                    .map(item => item.place);

                if (sortedResults.length > 0) {
                    setHospitals(sortedResults);
                    setStatus(LoadingStatus.Success);
                    setErrorMessage(null);
                } else {
                    setErrorMessage("Could not calculate distances for found hospitals.");
                    setStatus(LoadingStatus.NoResults);
                    setHospitals([]);
                }
            } else {
                 setErrorMessage("No relevant hospitals with location data found nearby matching the criteria.");
                 setStatus(LoadingStatus.NoResults);
                 setHospitals([]);
            }
        } else {
            setErrorMessage("No places found nearby matching the search query.");
            setStatus(LoadingStatus.NoResults);
            setHospitals([]);
        }
    } catch (error: any) {
        if (!isMounted.current) return;
        // console.error("Error during Place.searchByText:", error);
        let userMessage = `Failed to find hospitals. Please try again later.`;
        let specificStatus = LoadingStatus.SearchError;
        const errorMessageString = error?.message?.toLowerCase() || '';
        // ... (error message parsing as before) ...
        if (errorMessageString.includes('api_key_invalid') || errorMessageString.includes('permission denied') || errorMessageString.includes('apinotactivatedmaperror') || errorMessageString.includes('keyexpiredmaperror') || errorMessageString.includes('keyinvalidmaperror')) {
             userMessage = "Map service error: API Key invalid, restricted, expired, or 'Places API (New)' not enabled. Check configuration.";
             specificStatus = LoadingStatus.MapsError;
        } else if (errorMessageString.includes('zero_results')) {
             userMessage = "No places found nearby matching the search query.";
             specificStatus = LoadingStatus.NoResults;
        } else if (errorMessageString.includes('invalid_request')) {
             userMessage = "Map service request was invalid. Check parameters.";
             specificStatus = LoadingStatus.SearchError;
        } else if (errorMessageString.includes('network error') || errorMessageString.includes('fetch')) {
             userMessage = "Network error searching for hospitals. Check connection.";
             specificStatus = LoadingStatus.SearchError;
        }

        setErrorMessage(userMessage);
        setStatus(specificStatus);
        setHospitals([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, status]); // Depends on location and status

  // --- Effect to trigger search ---
  useEffect(() => {
    // Trigger search ONLY when status is SearchingHospitals
    // Other conditions (location, maps loaded) are checked within findNearbyHospitalsByText
    if (status === LoadingStatus.SearchingHospitals) {
        findNearbyHospitalsByText();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, findNearbyHospitalsByText]); // Trigger only when status becomes SearchingHospitals

  // --- Button Click Handler ---
  const handleShowHospitalsClick = useCallback(() => {
    // console.log("Show Hospitals button clicked.");
    setShowHospitalsRequested(true);
    setHospitals([]); // Clear previous results
    setErrorMessage(null);

    // Determine next step based on current state
    if (mapsApiLoaded.current && currentLocation) {
        // console.log("Maps loaded and location available. Starting search.");
        setStatus(LoadingStatus.SearchingHospitals);
    } else if (!currentLocation) {
        // console.log("Location missing. Requesting location.");
        handleRequestLocation(); // This will trigger search if maps are ready after location is found
    } else if (!mapsApiLoaded.current) {
        // console.log("Maps not loaded. Waiting for maps to load.");
        // Maps are loading in the background. Set status to LoadingMaps if not already an error.
        // The initMap callback will trigger the search if location is ready.
        if (status !== LoadingStatus.MapsError && status !== LoadingStatus.LoadingMaps) {
             setStatus(LoadingStatus.LoadingMaps);
        }
        // If maps failed to load previously (MapsError), try loading again
        if (status === LoadingStatus.MapsError) {
            handleLoadGoogleMaps();
        }
    }
  }, [status, currentLocation, handleRequestLocation, handleLoadGoogleMaps]);

  // --- Helper to generate Google Maps link ---
  const generateMapLink = (placeId: string | undefined): string => {
    if (!placeId) return '#';
    return `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;
  }

  // --- Render Hospital List Content ---
  const renderHospitalContent = () => {
    // Show button initially or if an error occurred before request
    if (!showHospitalsRequested) {
      // Button should be enabled unless maps are actively loading or config error
      const isButtonDisabled = status === LoadingStatus.LoadingMaps || status === LoadingStatus.ConfigError || status === LoadingStatus.Idle || status === LoadingStatus.PreLoad;
      let buttonText = "Show Nearby Hospitals";
      if (status === LoadingStatus.LoadingMaps) buttonText = "Loading Maps...";

      return (
        <div className="flex flex-col items-center justify-center text-center flex-grow py-10">
          <Hospital className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium mb-2">Find Hospitals Near You</p>
          <p className="text-gray-500 text-sm mb-6 max-w-md">Click the button to use your current location to find nearby hospitals with emergency and maternity services.</p>
          <Button
            onClick={handleShowHospitalsClick}
            disabled={isButtonDisabled}
            size="lg"
            className="bg-momcare-primary hover:bg-momcare-dark text-white"
          >
            {isButtonDisabled && status !== LoadingStatus.ConfigError && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isButtonDisabled && <Search className="mr-2 h-4 w-4" />}
            {buttonText}
          </Button>
           {/* Show maps error below button if it occurred during background load */}
           {status === LoadingStatus.MapsError && errorMessage && (
                <p className="text-red-600 text-xs mt-4 max-w-sm">{errorMessage}</p>
           )}
        </div>
      );
    }

    // --- If hospitals HAVE been requested, show status/results ---
    switch (status) {
        // Loading states after button click
        case LoadingStatus.Locating:
          return ( <div className="flex flex-col items-center justify-center text-center flex-grow py-10"><Loader2 className="h-10 w-10 animate-spin text-momcare-primary mb-4" /><p className="text-gray-600 font-medium">Getting your location...</p><p className="text-sm text-gray-500 mt-1">Please wait or allow location access.</p></div> );
        case LoadingStatus.LoadingMaps: // Show this if waiting for maps *after* button click
          return ( <div className="flex flex-col items-center justify-center text-center flex-grow py-10"><Loader2 className="h-10 w-10 animate-spin text-momcare-primary mb-4" /><p className="text-gray-600 font-medium">Loading map services...</p></div> );
        case LoadingStatus.SearchingHospitals:
          return ( <div className="space-y-4"><p className="text-center text-gray-600 font-medium mb-4">Finding and sorting nearby hospitals...</p>{[...Array(3)].map((_, i) => <HospitalSkeleton key={i} />)}</div> );

        // Error States (after button click)
        case LoadingStatus.LocationError: case LoadingStatus.MapsError: case LoadingStatus.SearchError: case LoadingStatus.ConfigError:
          const ErrorIcon = status === LoadingStatus.LocationError ? Ban
                           : status === LoadingStatus.ConfigError ? KeyRound
                           : status === LoadingStatus.MapsError ? WifiOff
                           : AlertTriangle;
          const errorTitle = status === LoadingStatus.ConfigError ? "Configuration Issue"
                           : status === LoadingStatus.LocationError ? "Location Error"
                           : status === LoadingStatus.MapsError ? "Map Service Error"
                           : "Search Error";
          return (
            <div className="flex flex-col items-center justify-center text-center flex-grow py-10 bg-red-50 p-6 rounded-md border border-red-200">
                <ErrorIcon className="h-10 w-10 text-red-500 mb-4" />
                <p className="text-red-700 font-semibold mb-2">{errorTitle}</p>
                <p className="text-red-600 text-sm mb-4 max-w-md">{errorMessage || "An unexpected error occurred."}</p>
                {status !== LoadingStatus.ConfigError && (
                    <Button onClick={handleShowHospitalsClick} variant="destructive" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                    </Button>
                )}
            </div>
           );

        // No Results State
        case LoadingStatus.NoResults:
          return (
            <div className="flex flex-col items-center justify-center text-center flex-grow py-10">
                <SearchX className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium mb-2">No Nearby Hospitals Found</p>
                <p className="text-gray-500 text-sm mb-4 max-w-md">{errorMessage || "We couldn't find relevant hospitals near your location matching the search criteria."}</p>
                <Button onClick={handleShowHospitalsClick} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh Search
                </Button>
            </div>
           );

        // Success State
        case LoadingStatus.Success:
          if (!currentLocation) { // Should have location by now, but safeguard
             return <p className="text-center py-10 text-gray-500">Location unavailable for distance calculation.</p>;
          }
          return (
            <div className="space-y-5">
              <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="font-medium text-blue-900">Opening Hours & Distance Note</AlertTitle>
                  <AlertDescription className="text-xs">
                    Hospitals are sorted by approximate distance. "Open Now" status reflects general hours from Google. Emergency Room availability may differ.
                    <strong className="block mt-1">Please call the hospital directly if possible to confirm ER status, capacity, and specific maternal care services before traveling.</strong>
                  </AlertDescription>
              </Alert>

              {hospitals.map((hospital, index) => {
                const placeId = hospital.id;
                const name = hospital.displayName;
                const address = hospital.formattedAddress;
                const distanceKm = hospital.location ? calculateDistance(currentLocation, { lat: hospital.location.lat(), lng: hospital.location.lng() }) : null;

                // Use the Place.isOpen() method (requires regularOpeningHours field)
                const isOpenNow = hospital.isOpen?.(); // Returns true, false, or undefined

                const rating = hospital.rating;
                const userRatingCount = hospital.userRatingCount;
                const statusText = hospital.businessStatus?.replace(/_/g, ' ').toLowerCase();
                const website = hospital.websiteURI;
                const phone = hospital.nationalPhoneNumber;

                return (
                    <Card key={placeId || index} className="border border-gray-200 shadow-sm rounded-lg overflow-hidden transition-shadow hover:shadow-md">
                       <CardHeader className="p-4">
                         <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-base font-semibold text-momcare-primary">{name || 'Hospital Name Unavailable'}</CardTitle>
                            {distanceKm !== null && (
                                <Badge variant="outline" className="text-xs font-medium whitespace-nowrap flex-shrink-0 border-blue-300 bg-blue-50 text-blue-800">
                                    <Route className="h-3 w-3 mr-1" />
                                    {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)} m` : `${distanceKm.toFixed(1)} km`} away
                                </Badge>
                            )}
                         </div>
                         {address && (<CardDescription className="text-xs text-gray-500 mt-0.5 flex items-start"><MapPin className="h-3 w-3 mr-1 flex-shrink-0 mt-px" />{address}</CardDescription>)}
                       </CardHeader>
                       <CardContent className="p-4 pt-0 space-y-2">
                       <div className="flex flex-wrap gap-2 items-center mb-2">
                             {isOpenNow !== undefined && (
                                <Badge
                                    variant={isOpenNow ? "default" : "destructive"}
                                    className={`text-xs font-medium ${isOpenNow ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 hover:text-green-900' : 'bg-red-100 text-red-800 border-red-200 hover:bg-momcare-primary hover:text-white'}`}
                                >
                                   {isOpenNow ? "Open Now (General)" : "Likely Closed (General)"}
                                </Badge>
                             )}
                             {isOpenNow === undefined && ( // Show if isOpen() returns undefined
                                 <Badge variant="outline" className="text-xs font-medium border-gray-300 bg-gray-100 text-gray-600">Hours Unknown</Badge>
                             )}
                             {typeof rating === 'number' && rating > 0 && (
                                <Badge variant="secondary" className="text-xs font-medium bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 hover:text-yellow-900">
                                    {rating.toFixed(1)} ★ {typeof userRatingCount === 'number' ? `(${userRatingCount} ratings)` : ''}
                                </Badge>
                             )}
                             {statusText && statusText !== 'operational' && (
                                <Badge variant="outline" className="text-xs capitalize border-orange-300 bg-orange-50 text-orange-800">
                                    {statusText}
                                </Badge>
                             )}
                         </div>
                         <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                            {phone && ( <a href={`tel:${phone}`} className="flex items-center hover:text-momcare-primary hover:underline focus:outline-none focus:ring-1 focus:ring-momcare-primary rounded"><PhoneCall className="h-3.5 w-3.5 mr-1" /> {phone}</a> )}
                            {website && ( <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-momcare-primary hover:underline focus:outline-none focus:ring-1 focus:ring-momcare-primary rounded"><Globe className="h-3.5 w-3.5 mr-1" /> Website</a> )}
                         </div>
                       </CardContent>
                       <CardFooter className="p-4 bg-gray-50/70 border-t">
                           <Button asChild size="sm" className="bg-momcare-primary hover:bg-momcare-dark text-white" disabled={!placeId}>
                             <a href={generateMapLink(placeId)} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${name || 'this hospital'}`} onClick={(e) => !placeId && e.preventDefault()} className={!placeId ? 'opacity-50 cursor-not-allowed' : ''}>
                               <Navigation className="mr-1.5 h-4 w-4" /> Get Directions
                             </a>
                           </Button>
                       </CardFooter>
                    </Card>
                );
              })}
               {/* Refresh button at the bottom */}
               <div className="mt-6 flex justify-center border-t pt-5">
                   <Button onClick={handleShowHospitalsClick} variant="outline" size="sm">
                       <RefreshCw className="mr-2 h-4 w-4" /> Refresh Hospital List
                   </Button>
               </div>
            </div>
          );
        // Default case for Idle, PreLoad, Ready states *after* button click (should be transient)
        default:
             // If user clicked but we are somehow back in these initial states, show generic loading
             return <div className="flex flex-col items-center justify-center text-center flex-grow py-10"><Loader2 className="h-10 w-10 animate-spin text-momcare-primary mb-4" /><p className="text-gray-600 font-medium">Initializing Search...</p></div>;
      }
  };

  // --- JSX Structure (Main component render) ---
  // No changes needed in the main JSX structure below this line
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
                  {/* Accordion Items remain the same as before */}
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
                   <AccordionItem value="item-3">
                    <AccordionTrigger className="text-base font-medium hover:no-underline">Bleeding Issues</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2 pt-2">
                       <p className="flex items-start"><AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" /><span><strong>Heavy Vaginal Bleeding:</strong> Soaking through a pad in an hour, with or without pain.</span></p>
                       <p className="text-xs text-gray-600 italic mt-1">Why it's urgent: Significant bleeding can indicate serious problems like placental abruption or placenta previa.</p>
                    </AccordionContent>
                  </AccordionItem>
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
            <CardTitle className="flex items-center text-xl font-semibold text-gray-800"><MapPinned className="mr-3 h-6 w-6 text-momcare-primary" />Nearby Hospitals (Nearest First)</CardTitle>
            <CardDescription className="mt-1 text-sm text-gray-600">
                {showHospitalsRequested ?
                    "Showing relevant facilities near your location, sorted by distance. Based on search for 'hospital emergency room maternity...'. Data by Google Maps."
                  : "Click the button below to find hospitals near you."
                }
                 {' '}<b>Always call 102 in a true emergency.</b>
            </CardDescription>
            {/* API Key/Error Alerts */}
            {status === LoadingStatus.MapsError && errorMessage?.includes("Google Cloud Console") && (
                 <Alert variant="destructive" className="mt-4 text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Action Required: Map Service Error</AlertTitle>
                    <AlertDescription>
                        The map service failed. Ensure <strong>Places API (New)</strong> is enabled in Google Cloud Console for the API key, check restrictions (HTTP referrers, API restrictions), and refresh/retry.
                    </AlertDescription>
                 </Alert>
            )}
             {status === LoadingStatus.ConfigError && (
                 <Alert variant="destructive" className="mt-4 text-xs">
                    <KeyRound className="h-4 w-4" />
                    <AlertTitle>Action Required: Configuration Error</AlertTitle>
                    <AlertDescription>
                        Google Maps API Key (`VITE_PUBLIC_GOOGLE_MAPS_API_KEY`) is missing. Set the environment variable correctly.
                    </AlertDescription>
                 </Alert>
            )}
          </CardHeader>
          <CardContent className="p-6 min-h-[300px] flex flex-col">
            {/* Render dynamic content: Button OR Loading/Results/Errors */}
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
                <p>Hospital information (including distance, opening hours, ratings, status, phone, website) is provided by Google Maps and may not always be completely up-to-date or reflect specific Emergency Room/Maternity Ward availability, capabilities, or capacity. Distance is approximate ("as the crow flies"). **Verify critical information directly with the hospital if possible, especially regarding ER status and capacity, before traveling.**</p>
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