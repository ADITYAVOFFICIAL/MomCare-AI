
declare global {
  interface Window {
    google: typeof google;
    [key: string]: any;
  }
}

declare namespace google.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  namespace places {
    class PlacesService {
      constructor(attrContainer: Element);
      nearbySearch(
        request: NearbySearchRequest,
        callback: (results: PlaceResult[], status: PlacesServiceStatus) => void
      ): void;
    }

    interface NearbySearchRequest {
      location: LatLng;
      rankBy?: RankBy;
      type?: string;
      keyword?: string;
      radius?: number;
    }

    enum RankBy {
      PROMINENCE = 0,
      DISTANCE = 1
    }

    enum PlacesServiceStatus {
      OK = "OK",
      ZERO_RESULTS = "ZERO_RESULTS",
      OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
      REQUEST_DENIED = "REQUEST_DENIED",
      INVALID_REQUEST = "INVALID_REQUEST",
      UNKNOWN_ERROR = "UNKNOWN_ERROR",
      NOT_FOUND = "NOT_FOUND"
    }

    interface PlaceResult {
      place_id: string;
      name: string;
      vicinity?: string;
      formatted_address?: string;
      geometry: {
        location: LatLng;
      };
      rating?: number;
      user_ratings_total?: number;
      types?: string[];
    }
  }
}

export {};
