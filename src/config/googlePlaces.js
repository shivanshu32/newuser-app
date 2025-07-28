// Google Places API Configuration
// Replace 'YOUR_GOOGLE_PLACES_API_KEY' with your actual Google Places API key
// To get an API key:
// 1. Go to Google Cloud Console (https://console.cloud.google.com/)
// 2. Create a new project or select an existing one
// 3. Enable the Places API
// 4. Create credentials (API Key)
// 5. Restrict the API key to Places API for security

export const GOOGLE_PLACES_API_KEY = 'AIzaSyAX7BtN22juT_Yiuwo1u7ArYixP3Jx_uhc';

// Google Places API configuration
export const GOOGLE_PLACES_CONFIG = {
  key: GOOGLE_PLACES_API_KEY,
  language: 'en',
  types: '(cities)', // Restrict to cities only
  components: 'country:in', // Restrict to India (optional)
};
