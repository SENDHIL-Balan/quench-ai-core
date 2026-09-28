import { useState } from "react";
import {
  MapPin,
  Star,
  Navigation,
  Clock,
  Phone,
  ExternalLink,
  Globe,
  Car,
  Footprints,
  Bike,
  Train,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  GoogleMapsResult,
  NormalizedPlace,
  NormalizedRoute,
} from "@/lib/tools/google-maps.server";
import { cn } from "@/lib/utils";

export function GoogleMapsCards({ data }: { data: GoogleMapsResult }) {
  if (!data) return null;

  if (data.type === "routes" && data.route) {
    return <RouteCard route={data.route} query={data.query} />;
  }

  if (Array.isArray(data.places) && data.places.length > 0) {
    return <PlaceList places={data.places} query={data.query} />;
  }

  return null;
}

function RouteCard({ route, query }: { route: NormalizedRoute; query: string }) {
  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case "WALK":
        return <Footprints className="size-4 text-emerald-400" />;
      case "BICYCLE":
        return <Bike className="size-4 text-amber-400" />;
      case "TRANSIT":
        return <Train className="size-4 text-indigo-400" />;
      default:
        return <Car className="size-4 text-cyan-400" />;
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#161821]/90 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Navigation className="size-3.5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Google Maps Route
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-zinc-300">
          {getTravelModeIcon(route.travelMode)}
          <span className="capitalize">{route.travelMode.toLowerCase()}</span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center">
              <div className="size-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <div className="h-8 w-0.5 bg-gradient-to-b from-cyan-400 to-rose-400" />
              <div className="size-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Origin
                </p>
                <p className="text-sm font-semibold text-white">{route.origin}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Destination
                </p>
                <p className="text-sm font-semibold text-white">{route.destination}</p>
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium text-zinc-400">Total Distance</p>
              <p className="text-base font-bold text-white tracking-tight">
                {route.distanceFormatted}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400">Estimated Duration</p>
              <p className="text-base font-bold text-cyan-400 tracking-tight">
                {route.durationFormatted}
              </p>
            </div>
          </div>

          {route.description && (
            <p className="text-xs text-zinc-400">
              <span className="font-medium text-zinc-300">Via:</span> {route.description}
            </p>
          )}

          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-end">
            <a
              href={route.googleMapsUri}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 hover:border-cyan-400/50 shadow-sm"
            >
              <Navigation className="size-3.5" />
              <span>Navigate in Google Maps</span>
              <ExternalLink className="size-3 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceList({ places, query }: { places: NormalizedPlace[]; query: string }) {
  return (
    <div className="my-4 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <MapPin className="size-3" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Google Maps Results ({places.length})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {places.map((place, idx) => (
          <PlaceCard key={place.placeId || `${place.name}-${idx}`} place={place} index={idx} />
        ))}
      </div>
    </div>
  );
}

function PlaceCard({ place, index }: { place: NormalizedPlace; index: number }) {
  const [showHours, setShowHours] = useState(false);

  const cleanCategory = place.primaryType
    ? place.primaryType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : undefined;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    place.name + " " + place.address,
  )}`;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#161821]/80 p-4 shadow-lg transition-all hover:border-cyan-500/40 hover:bg-[#1a1d29]/90">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-zinc-300">
                {index + 1}
              </span>
              <h4 className="truncate text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                {place.name}
              </h4>
            </div>

            {cleanCategory && (
              <span className="mt-1 inline-block rounded-md border border-white/5 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                {cleanCategory}
              </span>
            )}
          </div>

          {typeof place.rating === "number" && (
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              <span>{place.rating.toFixed(1)}</span>
              {place.userRatingCount && (
                <span className="text-[10px] text-amber-300/70">
                  (
                  {place.userRatingCount > 999
                    ? `${(place.userRatingCount / 1000).toFixed(1)}k`
                    : place.userRatingCount}
                  )
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-2.5 flex items-start gap-1.5 text-xs text-zinc-400">
          <MapPin className="size-3.5 shrink-0 text-zinc-400 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed">
            {place.address || "Address available in Maps"}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {place.distanceFormatted && (
            <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
              <Navigation className="size-2.5" />
              {place.distanceFormatted}
            </span>
          )}

          {place.openNow !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border",
                place.openNow
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
              )}
            >
              <Clock className="size-2.5" />
              {place.openNow ? "Open Now" : "Closed"}
            </span>
          )}

          {place.phoneNumber && (
            <a
              href={`tel:${place.phoneNumber}`}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              <Phone className="size-2.5" />
              <span>{place.phoneNumber}</span>
            </a>
          )}

          {place.websiteUri && (
            <a
              href={place.websiteUri}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
            >
              <Globe className="size-2.5" />
              <span>Website</span>
            </a>
          )}
        </div>

        {place.weekdayDescriptions && place.weekdayDescriptions.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setShowHours((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Clock className="size-3 text-zinc-400" />
              <span>Weekly Schedule</span>
              {showHours ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {showHours && (
              <ul className="mt-1.5 space-y-0.5 rounded-lg border border-white/5 bg-black/40 p-2 text-[10px] text-zinc-300">
                {place.weekdayDescriptions.map((desc, i) => (
                  <li key={i}>{desc}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2.5">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
        >
          <Navigation className="size-3 text-cyan-400" />
          <span>Directions</span>
        </a>

        <a
          href={place.googleMapsUri || directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white transition-all hover:bg-white/10 hover:border-cyan-500/40"
        >
          <span>Open in Maps</span>
          <ExternalLink className="size-3 text-zinc-400" />
        </a>
      </div>
    </div>
  );
}
