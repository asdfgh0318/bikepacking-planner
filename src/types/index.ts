export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
}

export interface RouteStats {
  distanceKm: number;
  ascentM: number;
  descentM: number;
}

export interface SupplyPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'paczkomat' | 'zabka' | 'biedronka' | 'shop';
  distanceFromStartKm: number;
  details?: {
    address?: string;
    openingHours?: string;
    is24h?: boolean;
    lockerSize?: string[];
  };
}
