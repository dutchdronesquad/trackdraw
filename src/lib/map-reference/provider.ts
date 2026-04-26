export const mapReferenceProvider = {
  id: "esri-world-imagery",
  name: "Esri World Imagery",
  defaultStyle: "satellite",
  styles: {
    satellite: {
      tileUrl:
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        "Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
} as const;

export const MAP_REFERENCE_DEFAULT_ZOOM = 18;
export const MAP_REFERENCE_MIN_ZOOM = 1;
export const MAP_REFERENCE_MAX_ZOOM = 20;
export const MAP_REFERENCE_TILE_SIZE = 256;
