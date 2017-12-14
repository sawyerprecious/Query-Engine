// Interface from GET request; used to get lat and lon for rooms

export interface GeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}