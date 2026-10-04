"use client";

// Crédito CC-BY dos modelos 3D de terceiros no (i), numa linha só e só com as
// camadas ligadas. Source de atribuição é imutável, então o texto muda por
// remove/add. O (i) só lista sources "used" por um layer visível: daí o probe
// invisível, com o mesmo minzoom dos modelos (crédito aparece junto com eles).
import { useEffect } from "react";
import { useMap } from "@/components/ui/map";
import { CAR_MODEL_CREDIT, CARS_MIN_ZOOM } from "@/config/cars";
import { STREET_LAMP_MODEL_CREDIT } from "@/config/streetLamps";

const SOURCE_ID = "models-3d-attribution";
const PROBE_ID = "models-3d-attribution-probe";
const CC_BY =
  '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC-BY-4.0</a>';

export function ModelsAttribution({ cars, lamps }: { cars: boolean; lamps: boolean }) {
  const { map, isLoaded } = useMap();
  const credits = [cars && CAR_MODEL_CREDIT, lamps && STREET_LAMP_MODEL_CREDIT].filter(Boolean);
  const attribution = credits.length ? `Modelos 3D: ${credits.join(" · ")}, ${CC_BY}` : "";

  useEffect(() => {
    if (!map || !isLoaded || !attribution) return;
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      attribution,
    });
    map.addLayer({
      id: PROBE_ID,
      type: "circle",
      source: SOURCE_ID,
      minzoom: CARS_MIN_ZOOM,
      paint: { "circle-opacity": 0 },
    });
    return () => {
      if (map.getLayer(PROBE_ID)) map.removeLayer(PROBE_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, isLoaded, attribution]);

  return null;
}
