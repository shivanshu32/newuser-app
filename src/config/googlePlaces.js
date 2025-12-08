// Google Places API Configuration
// APIs enabled in Google Cloud Console:
// - Maps JavaScript API
// - Places API
// - Geocoding API

export const GOOGLE_PLACES_API_KEY = 'AIzaSyAX7BtN22juT_Yiuwo1u7ArYixP3Jx_uhc';

// Google Places Autocomplete API configuration
export const GOOGLE_PLACES_CONFIG = {
  key: GOOGLE_PLACES_API_KEY,
  language: 'en',
  // Using (cities) type to get city-level suggestions for birth location
  types: '(cities)',
  // Restrict to India (can be removed for worldwide search)
  components: 'country:in',
};

// Places API endpoints
export const GOOGLE_PLACES_ENDPOINTS = {
  autocomplete: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  details: 'https://maps.googleapis.com/maps/api/place/details/json',
  geocode: 'https://maps.googleapis.com/maps/api/geocode/json',
};
