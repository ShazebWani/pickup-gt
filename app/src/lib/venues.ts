import type { Sport } from '../types';

export interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sports: Sport[];
}

export const VENUES: Venue[] = [
  {
    id: 'crc-outdoor-basketball',
    name: 'CRC Outdoor Basketball Courts',
    lat: 33.7756,
    lng: -84.4035,
    sports: ['basketball'],
  },
  {
    id: 'burger-bowl-field',
    name: 'Burger Bowl Field',
    lat: 33.7786,
    lng: -84.4046,
    sports: ['soccer', 'football', 'spikeball'],
  },
  {
    id: 'roe-stamps-field',
    name: 'Roe Stamps Field',
    lat: 33.7749,
    lng: -84.4013,
    sports: ['soccer', 'football'],
  },
  {
    id: 'crc-tennis-courts',
    name: 'CRC Tennis Courts',
    lat: 33.7761,
    lng: -84.4042,
    sports: ['tennis'],
  },
  {
    id: 'peters-parking-deck-courts',
    name: 'Peters Parking Deck Courts',
    lat: 33.7739,
    lng: -84.3975,
    sports: ['basketball'],
  },
  {
    id: 'tech-green',
    name: 'Tech Green',
    lat: 33.7745,
    lng: -84.3963,
    sports: ['spikeball', 'volleyball', 'other'],
  },
];

// GT campus, used to center the map and validate free-pin drops loosely.
export const CAMPUS_REGION = {
  latitude: 33.7756,
  longitude: -84.3963,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};
