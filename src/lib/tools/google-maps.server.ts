/**
 * Bravura AI — Google Maps Platform Integration (Server-Side)
 *
 * Implements real Google Maps Web Services:
 * - Places API (New) Text Search (/v1/places:searchText)
 * - Places API (New) Nearby Search (/v1/places:searchNearby)
 * - Places API (New) Place Details (/v1/places/{id})
 * - Routes API (v2) Compute Routes (/directions/v2:computeRoutes)
 * - Geocoding & Coordinate Resolution via Places API (New)
 *
 * Compliance:
 * - Includes attribution header: X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1
 * - Strict field masking via X-Goog-FieldMask for performance and cost efficiency
 * - Real data only: never fabricates ratings, distances, or opening hours
 */

export interface NormalizedPlace {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  weekdayDescriptions?: string[];
  primaryType?: string;
  distanceMeters?: number;
  distanceFormatted?: string;
  googleMapsUri?: string;
  phoneNumber?: string;
  websiteUri?: string;
  priceLevel?: string;
}

export interface NormalizedRoute {
  origin: string;
  destination: string;
  distanceMeters: number;
  distanceFormatted: string;
  durationSeconds: number;
  durationFormatted: string;
  travelMode: "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";
  description?: string;
  encodedPolyline?: string;
  googleMapsUri: string;
}

export interface GoogleMapsResult {
  type:
    "place_search" | "nearby_search" | "place_details" | "routes" | "geocode" | "reverse_geocode";
  query: string;
  center?: { latitude: number; longitude: number };
  places: NormalizedPlace[];
  route?: NormalizedRoute;
  summary: string;
}

export function getGoogleMapsApiKey(): string {
  const key =
    process.env["GOOGLE_MAPS_API_KEY"]?.trim() ||
    process.env["VITE_GOOGLE_MAPS_API_KEY"]?.trim() ||
    "AIzaSyBvd6ALi_jADSQoeBdlmnNcm1hcTAFjIR8";
  return key;
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function formatMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} hr ${remMins} mins` : `${hours} hr`;
}

/**
 * 1. Text Search (New) - searches places using freeform text query
 */
export async function searchPlacesText(params: {
  query: string;
  pageSize?: number;
  locationBias?: { latitude: number; longitude: number; radiusMeters?: number };
  openNow?: boolean;
  minRating?: number;
}): Promise<GoogleMapsResult> {
  const apiKey = getGoogleMapsApiKey();
  const pageSize = Math.min(params.pageSize || 6, 20);

  const requestBody: Record<string, unknown> = {
    textQuery: params.query,
    pageSize,
  };

  if (params.locationBias) {
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: params.locationBias.latitude,
          longitude: params.locationBias.longitude,
        },
        radius: params.locationBias.radiusMeters || 5000.0,
      },
    };
  }

  if (typeof params.openNow === "boolean") {
    requestBody.openNow = params.openNow;
  }
  if (typeof params.minRating === "number") {
    requestBody.minRating = Math.max(0, Math.min(5, params.minRating));
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.regularOpeningHours.openNow,places.primaryType,places.websiteUri,places.nationalPhoneNumber,places.priceLevel",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[bravura-maps] Text Search failed:", response.status, errorText);
    throw new Error(`Google Maps search failed (${response.status}): ${errorText.slice(0, 150)}`);
  }

  const json = (await response.json()) as { places?: Array<Record<string, unknown>> };
  const rawPlaces = json.places || [];

  const places: NormalizedPlace[] = rawPlaces.map((p) => {
    const loc = p.location as { latitude?: number; longitude?: number } | undefined;
    const lat = loc?.latitude || 0;
    const lng = loc?.longitude || 0;

    let distMeters: number | undefined;
    let distFormatted: string | undefined;
    if (params.locationBias && lat && lng) {
      const km = calculateDistanceKm(
        params.locationBias.latitude,
        params.locationBias.longitude,
        lat,
        lng,
      );
      distMeters = km * 1000;
      distFormatted = `${km} km`;
    }

    const regularHours = p.regularOpeningHours as { openNow?: boolean } | undefined;
    const displayNameObj = p.displayName as { text?: string } | undefined;
    const name = displayNameObj?.text || (p.formattedAddress as string) || "Place";

    return {
      placeId: (p.id as string) || "",
      name,
      address: (p.formattedAddress as string) || "",
      latitude: lat,
      longitude: lng,
      rating: typeof p.rating === "number" ? p.rating : undefined,
      userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
      openNow: regularHours ? Boolean(regularHours.openNow) : undefined,
      primaryType: (p.primaryType as string) || undefined,
      distanceMeters: distMeters,
      distanceFormatted: distFormatted,
      googleMapsUri:
        (p.googleMapsUri as string) ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${p.id || ""}`,
      phoneNumber: (p.nationalPhoneNumber as string) || undefined,
      websiteUri: (p.websiteUri as string) || undefined,
      priceLevel: (p.priceLevel as string) || undefined,
    };
  });

  return {
    type: "place_search",
    query: params.query,
    center: params.locationBias
      ? { latitude: params.locationBias.latitude, longitude: params.locationBias.longitude }
      : places[0]
        ? { latitude: places[0].latitude, longitude: places[0].longitude }
        : undefined,
    places,
    summary: `Found ${places.length} place(s) matching "${params.query}".`,
  };
}

/**
 * 2. Nearby Search (New) - searches places within a radius around specific coordinates
 */
export async function searchPlacesNearby(params: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  includedTypes?: string[];
  maxResultCount?: number;
  rankPreference?: "POPULARITY" | "DISTANCE";
}): Promise<GoogleMapsResult> {
  const apiKey = getGoogleMapsApiKey();
  const radius = Math.min(Math.max(params.radiusMeters || 3000, 100), 50000);
  const maxResultCount = Math.min(params.maxResultCount || 6, 20);

  const requestBody: Record<string, unknown> = {
    locationRestriction: {
      circle: {
        center: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        radius,
      },
    },
    maxResultCount,
  };

  if (Array.isArray(params.includedTypes) && params.includedTypes.length > 0) {
    requestBody.includedTypes = params.includedTypes;
  }
  if (params.rankPreference) {
    requestBody.rankPreference = params.rankPreference;
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.regularOpeningHours.openNow,places.primaryType,places.websiteUri,places.nationalPhoneNumber",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[bravura-maps] Nearby Search failed:", response.status, errorText);
    throw new Error(
      `Google Maps nearby search failed (${response.status}): ${errorText.slice(0, 150)}`,
    );
  }

  const json = (await response.json()) as { places?: Array<Record<string, unknown>> };
  const rawPlaces = json.places || [];

  const places: NormalizedPlace[] = rawPlaces.map((p) => {
    const loc = p.location as { latitude?: number; longitude?: number } | undefined;
    const lat = loc?.latitude || 0;
    const lng = loc?.longitude || 0;

    let distMeters: number | undefined;
    let distFormatted: string | undefined;
    if (lat && lng) {
      const km = calculateDistanceKm(params.latitude, params.longitude, lat, lng);
      distMeters = km * 1000;
      distFormatted = `${km} km`;
    }

    const regularHours = p.regularOpeningHours as { openNow?: boolean } | undefined;
    const displayNameObj = p.displayName as { text?: string } | undefined;
    const name = displayNameObj?.text || (p.formattedAddress as string) || "Place";

    return {
      placeId: (p.id as string) || "",
      name,
      address: (p.formattedAddress as string) || "",
      latitude: lat,
      longitude: lng,
      rating: typeof p.rating === "number" ? p.rating : undefined,
      userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
      openNow: regularHours ? Boolean(regularHours.openNow) : undefined,
      primaryType: (p.primaryType as string) || undefined,
      distanceMeters: distMeters,
      distanceFormatted: distFormatted,
      googleMapsUri:
        (p.googleMapsUri as string) ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${p.id || ""}`,
      phoneNumber: (p.nationalPhoneNumber as string) || undefined,
      websiteUri: (p.websiteUri as string) || undefined,
    };
  });

  // Sort by rating or distance if specified
  if (params.rankPreference !== "DISTANCE") {
    places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return {
    type: "nearby_search",
    query: `Places near coordinates (${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)})`,
    center: { latitude: params.latitude, longitude: params.longitude },
    places,
    summary: `Found ${places.length} place(s) near coordinates.`,
  };
}

/**
 * 3. Place Details (New) - retrieves in-depth information about a specific place
 */
export async function getPlaceDetails(params: { placeId: string }): Promise<GoogleMapsResult> {
  const apiKey = getGoogleMapsApiKey();
  const cleanId = params.placeId.trim();

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri,regularOpeningHours,primaryType,websiteUri,nationalPhoneNumber,editorialSummary",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[bravura-maps] Place Details failed:", response.status, errorText);
    throw new Error(
      `Google Maps Place Details failed (${response.status}): ${errorText.slice(0, 150)}`,
    );
  }

  const p = (await response.json()) as Record<string, unknown>;
  const loc = p.location as { latitude?: number; longitude?: number } | undefined;
  const lat = loc?.latitude || 0;
  const lng = loc?.longitude || 0;

  const displayNameObj = p.displayName as { text?: string } | undefined;
  const regularHours = p.regularOpeningHours as
    | {
        openNow?: boolean;
        weekdayDescriptions?: string[];
      }
    | undefined;
  const name = displayNameObj?.text || (p.formattedAddress as string) || "Place";

  const place: NormalizedPlace = {
    placeId: (p.id as string) || cleanId,
    name,
    address: (p.formattedAddress as string) || "",
    latitude: lat,
    longitude: lng,
    rating: typeof p.rating === "number" ? p.rating : undefined,
    userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
    openNow: regularHours ? Boolean(regularHours.openNow) : undefined,
    weekdayDescriptions: regularHours?.weekdayDescriptions,
    primaryType: (p.primaryType as string) || undefined,
    googleMapsUri:
      (p.googleMapsUri as string) ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${cleanId}`,
    phoneNumber: (p.nationalPhoneNumber as string) || undefined,
    websiteUri: (p.websiteUri as string) || undefined,
  };

  return {
    type: "place_details",
    query: name,
    center: { latitude: lat, longitude: lng },
    places: [place],
    summary: `Retrieved complete details for "${name}".`,
  };
}

/**
 * 4. Geocode Place - resolves address or location name to exact coordinates and details
 */
export async function geocodePlace(params: { address: string }): Promise<GoogleMapsResult> {
  const apiKey = getGoogleMapsApiKey();
  const cleanAddress = params.address.trim();

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType",
    },
    body: JSON.stringify({
      textQuery: cleanAddress,
      pageSize: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[bravura-maps] Geocoding failed:", response.status, errorText);
    throw new Error(
      `Google Maps geocoding failed (${response.status}): ${errorText.slice(0, 150)}`,
    );
  }

  const json = (await response.json()) as { places?: Array<Record<string, unknown>> };
  const rawPlaces = json.places || [];
  const p = rawPlaces[0];

  if (!p) {
    return {
      type: "geocode",
      query: cleanAddress,
      places: [],
      summary: `Could not geocode location "${cleanAddress}".`,
    };
  }

  const loc = p.location as { latitude?: number; longitude?: number } | undefined;
  const lat = loc?.latitude || 0;
  const lng = loc?.longitude || 0;
  const displayNameObj = p.displayName as { text?: string } | undefined;
  const name = displayNameObj?.text || (p.formattedAddress as string) || cleanAddress;

  const place: NormalizedPlace = {
    placeId: (p.id as string) || "",
    name,
    address: (p.formattedAddress as string) || "",
    latitude: lat,
    longitude: lng,
    primaryType: (p.primaryType as string) || undefined,
    googleMapsUri:
      (p.googleMapsUri as string) ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
  };

  return {
    type: "geocode",
    query: cleanAddress,
    center: { latitude: lat, longitude: lng },
    places: [place],
    summary: `Geocoded "${cleanAddress}" to coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)}) at address: ${place.address}.`,
  };
}

/**
 * 5. Reverse Geocode Location - finds place / address from latitude and longitude
 */
export async function reverseGeocodeLocation(params: {
  latitude: number;
  longitude: number;
}): Promise<GoogleMapsResult> {
  const apiKey = getGoogleMapsApiKey();

  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType",
    },
    body: JSON.stringify({
      locationRestriction: {
        circle: {
          center: { latitude: params.latitude, longitude: params.longitude },
          radius: 500,
        },
      },
      maxResultCount: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[bravura-maps] Reverse Geocode failed:", response.status, errorText);
    throw new Error(
      `Google Maps reverse geocoding failed (${response.status}): ${errorText.slice(0, 150)}`,
    );
  }

  const json = (await response.json()) as { places?: Array<Record<string, unknown>> };
  const rawPlaces = json.places || [];
  const p = rawPlaces[0];

  if (!p) {
    return {
      type: "reverse_geocode",
      query: `${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`,
      places: [],
      summary: `No specific place returned for coordinates (${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}).`,
    };
  }

  const displayNameObj = p.displayName as { text?: string } | undefined;
  const name = displayNameObj?.text || (p.formattedAddress as string) || "Location";

  const place: NormalizedPlace = {
    placeId: (p.id as string) || "",
    name,
    address: (p.formattedAddress as string) || "",
    latitude: params.latitude,
    longitude: params.longitude,
    primaryType: (p.primaryType as string) || undefined,
    googleMapsUri:
      (p.googleMapsUri as string) ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
  };

  return {
    type: "reverse_geocode",
    query: `${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`,
    center: { latitude: params.latitude, longitude: params.longitude },
    places: [place],
    summary: `Coordinates (${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}) correspond to "${name}" at ${place.address}.`,
  };
}

/**
 * 6. Routes API (v2) - calculates navigation routes, distance, and duration
 */
export async function computeDirections(params: {
  origin: string | { latitude: number; longitude: number };
  destination: string | { latitude: number; longitude: number };
  travelMode?: "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";
}): Promise<GoogleMapsResult> {
  const apiKey = getGoogleMapsApiKey();
  const travelMode = params.travelMode || "DRIVE";

  const formatWaypoint = (wp: string | { latitude: number; longitude: number }) => {
    if (typeof wp === "string") {
      const coordMatch = wp.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (coordMatch && coordMatch[1] && coordMatch[2]) {
        return {
          location: {
            latLng: {
              latitude: parseFloat(coordMatch[1]),
              longitude: parseFloat(coordMatch[2]),
            },
          },
        };
      }
      return { address: wp };
    }
    return {
      location: {
        latLng: {
          latitude: wp.latitude,
          longitude: wp.longitude,
        },
      },
    };
  };

  const originDesc =
    typeof params.origin === "string"
      ? params.origin
      : `${params.origin.latitude.toFixed(4)}, ${params.origin.longitude.toFixed(4)}`;
  const destDesc =
    typeof params.destination === "string"
      ? params.destination
      : `${params.destination.latitude.toFixed(4)}, ${params.destination.longitude.toFixed(4)}`;

  const requestBody = {
    origin: formatWaypoint(params.origin),
    destination: formatWaypoint(params.destination),
    travelMode,
    routingPreference: travelMode === "DRIVE" ? "TRAFFIC_AWARE" : undefined,
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
    },
    languageCode: "en",
  };

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[bravura-maps] Routes computation failed:", response.status, errorText);
    throw new Error(
      `Google Maps route computation failed (${response.status}): ${errorText.slice(0, 150)}`,
    );
  }

  const json = (await response.json()) as {
    routes?: Array<{
      duration?: string;
      distanceMeters?: number;
      description?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  };

  const firstRoute = json.routes?.[0];
  if (!firstRoute) {
    return {
      type: "routes",
      query: `Directions from ${originDesc} to ${destDesc}`,
      places: [],
      summary: `No route found between ${originDesc} and ${destDesc}.`,
    };
  }

  const distanceMeters = firstRoute.distanceMeters || 0;
  const durationRaw = firstRoute.duration || "0s";
  const durationSeconds = parseInt(durationRaw.replace("s", ""), 10) || 0;

  const modeParam =
    travelMode === "WALK"
      ? "walking"
      : travelMode === "BICYCLE"
        ? "bicycling"
        : travelMode === "TRANSIT"
          ? "transit"
          : "driving";

  const googleMapsUri = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originDesc)}&destination=${encodeURIComponent(destDesc)}&travelmode=${modeParam}`;

  const route: NormalizedRoute = {
    origin: originDesc,
    destination: destDesc,
    distanceMeters,
    distanceFormatted: formatMeters(distanceMeters),
    durationSeconds,
    durationFormatted: formatDurationSeconds(durationSeconds),
    travelMode,
    description: firstRoute.description,
    encodedPolyline: firstRoute.polyline?.encodedPolyline,
    googleMapsUri,
  };

  return {
    type: "routes",
    query: `Directions from ${originDesc} to ${destDesc} (${travelMode.toLowerCase()})`,
    places: [],
    route,
    summary: `Route from ${originDesc} to ${destDesc}: ${route.distanceFormatted}, estimated ${route.durationFormatted} via ${travelMode.toLowerCase()}${route.description ? ` (${route.description})` : ""}.`,
  };
}

/**
 * Formats structured Google Maps results into a factual prompt observation for the LLM
 */
export function formatMapsObservationForPrompt(result: GoogleMapsResult): string {
  const lines: string[] = [];

  lines.push("### 🗺️ Real-World Google Maps & Places Intelligence");
  lines.push(`*Operation*: \`${result.type}\` | *Search Context*: **"${result.query}"**`);

  if (result.type === "routes" && result.route) {
    const r = result.route;
    lines.push(`\n**Verified Navigation Route Details**:`);
    lines.push(`- **Origin**: ${r.origin}`);
    lines.push(`- **Destination**: ${r.destination}`);
    lines.push(`- **Total Distance**: ${r.distanceFormatted} (${r.distanceMeters} meters)`);
    lines.push(
      `- **Estimated Travel Duration**: ${r.durationFormatted} (${r.durationSeconds} seconds)`,
    );
    lines.push(`- **Travel Mode**: ${r.travelMode}`);
    if (r.description) lines.push(`- **Primary Route Corridors**: ${r.description}`);
    lines.push(`- **Direct Google Maps Navigation Link**: ${r.googleMapsUri}`);
  } else if (result.places.length > 0) {
    lines.push(`\n**Verified Places Found from Google Maps (${result.places.length} locations)**:`);
    result.places.forEach((p, idx) => {
      const parts = [`${idx + 1}. **${p.name}**`];
      if (p.rating) {
        parts.push(
          `⭐ ${p.rating.toFixed(1)}${p.userRatingCount ? ` (${p.userRatingCount.toLocaleString()} reviews)` : ""}`,
        );
      }
      if (p.openNow !== undefined) {
        parts.push(p.openNow ? "🕒 Open Now" : "🕒 Currently Closed");
      }
      if (p.distanceFormatted) {
        parts.push(`📏 ${p.distanceFormatted} away`);
      }
      if (p.address) {
        parts.push(`📍 Address: ${p.address}`);
      }
      if (p.phoneNumber) {
        parts.push(`📞 ${p.phoneNumber}`);
      }
      if (p.websiteUri) {
        parts.push(`🌐 Website: ${p.websiteUri}`);
      }
      if (p.weekdayDescriptions && p.weekdayDescriptions.length > 0) {
        parts.push(`🕒 Hours: ${p.weekdayDescriptions.join("; ")}`);
      }
      if (p.googleMapsUri) {
        parts.push(`🔗 [Open in Google Maps](${p.googleMapsUri})`);
      }
      lines.push(parts.join(" | "));
    });
  } else if (result.type === "geocode" || result.type === "reverse_geocode") {
    lines.push(`\n**Geocoding Result**: ${result.summary}`);
  } else {
    lines.push(
      `\n*Notice*: No matching locations or businesses were returned by Google Maps for this search area.`,
    );
  }

  lines.push(
    `\n*Grounding Requirement*: You must synthesize and explain these genuine Google Maps results naturally for the user. Do not invent missing facts. Include place names, ratings, addresses, and distances accurately.`,
  );

  return lines.join("\n");
}
