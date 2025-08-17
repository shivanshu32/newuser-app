/**
 * Horoscope Service
 * Integrates with Any.ge Horoscope API to fetch daily horoscopes
 */

const HOROSCOPE_API_BASE = 'https://any.ge/horoscope/api/';

// Zodiac signs mapping
export const ZODIAC_SIGNS = [
  { key: 'aries', name: 'Aries', symbol: '♈', dates: 'Mar 21 - Apr 19' },
  { key: 'taurus', name: 'Taurus', symbol: '♉', dates: 'Apr 20 - May 20' },
  { key: 'gemini', name: 'Gemini', symbol: '♊', dates: 'May 21 - Jun 20' },
  { key: 'cancer', name: 'Cancer', symbol: '♋', dates: 'Jun 21 - Jul 22' },
  { key: 'leo', name: 'Leo', symbol: '♌', dates: 'Jul 23 - Aug 22' },
  { key: 'virgo', name: 'Virgo', symbol: '♍', dates: 'Aug 23 - Sep 22' },
  { key: 'libra', name: 'Libra', symbol: '♎', dates: 'Sep 23 - Oct 22' },
  { key: 'scorpio', name: 'Scorpio', symbol: '♏', dates: 'Oct 23 - Nov 21' },
  { key: 'sagittarius', name: 'Sagittarius', symbol: '♐', dates: 'Nov 22 - Dec 21' },
  { key: 'capricorn', name: 'Capricorn', symbol: '♑', dates: 'Dec 22 - Jan 19' },
  { key: 'aquarius', name: 'Aquarius', symbol: '♒', dates: 'Jan 20 - Feb 18' },
  { key: 'pisces', name: 'Pisces', symbol: '♓', dates: 'Feb 19 - Mar 20' }
];

// Day options
export const DAY_OPTIONS = [
  { key: 'today', name: 'Today' },
  { key: 'tomorrow', name: 'Tomorrow' },
  { key: 'yesterday', name: 'Yesterday' }
];

// Session cache for horoscope data
const horoscopeCache = new Map();

/**
 * Generate cache key for horoscope data
 */
const getCacheKey = (sign, day) => `${sign}_${day}`;

/**
 * Fetch daily horoscope from Any.ge API
 * @param {string} sign - Zodiac sign (e.g., 'aries', 'taurus')
 * @param {string} day - Day option ('today', 'tomorrow', 'yesterday')
 * @returns {Promise<Object>} Horoscope data
 */
export const fetchDailyHoroscope = async (sign, day = 'today') => {
  try {
    // Validate inputs
    if (!sign || !day) {
      throw new Error('Sign and day are required parameters');
    }

    const validSigns = ZODIAC_SIGNS.map(s => s.key);
    const validDays = DAY_OPTIONS.map(d => d.key);

    if (!validSigns.includes(sign.toLowerCase())) {
      throw new Error(`Invalid zodiac sign: ${sign}`);
    }

    if (!validDays.includes(day.toLowerCase())) {
      throw new Error(`Invalid day option: ${day}`);
    }

    // Check cache first
    const cacheKey = getCacheKey(sign.toLowerCase(), day.toLowerCase());
    if (horoscopeCache.has(cacheKey)) {
      console.log(`[HoroscopeService] Returning cached data for ${cacheKey}`);
      return horoscopeCache.get(cacheKey);
    }

    // Build API URL - Based on Any.ge documentation
    const url = `${HOROSCOPE_API_BASE}?sign=${sign.toLowerCase()}&type=daily&day=${day.toLowerCase()}&lang=en`;
    
    console.log(`[HoroscopeService] Fetching horoscope from: ${url}`);

    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'JyotishCall-App/1.0',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    // Get response as text first to handle different content types
    const responseText = await response.text();
    console.log(`[HoroscopeService] Raw response text:`, responseText);

    // Handle null or empty responses
    if (!responseText || responseText.trim() === '' || responseText === 'null') {
      throw new Error(`API returned empty response for ${sign} - ${day}. This day might not be available.`);
    }

    let data;
    try {
      // Try to parse as JSON
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If not JSON, treat as plain text horoscope
      console.log(`[HoroscopeService] Response is not JSON, treating as plain text`);
      data = responseText.trim();
    }

    console.log(`[HoroscopeService] Parsed data:`, data);

    // Handle null data after parsing
    if (data === null || data === undefined) {
      throw new Error(`API returned null data for ${sign} - ${day}. This day might not be available.`);
    }

    // Extract horoscope text based on Any.ge API response format
    let horoscopeText = '';
    
    if (typeof data === 'string') {
      // Plain text response
      horoscopeText = data.trim();
    } else if (data && typeof data === 'object') {
      // JSON response - check common field names based on API docs
      if (Array.isArray(data)) {
        // If it's an array, take the first element and extract text from it
        const firstElement = data[0];
        if (firstElement && typeof firstElement === 'object') {
          horoscopeText = firstElement.text || 
                         firstElement.horoscope || 
                         firstElement.content || 
                         firstElement.prediction || 
                         firstElement.message || 
                         firstElement.description ||
                         '';
        } else if (typeof firstElement === 'string') {
          horoscopeText = firstElement;
        }
      } else {
        // Object response - try different field names
        horoscopeText = data.horoscope || 
                       data.text || 
                       data.content || 
                       data.prediction || 
                       data.message || 
                       data.description ||
                       data.daily ||
                       data[day] || // Sometimes the day is the key
                       data[sign] || // Sometimes the sign is the key
                       '';
        
        // If still no text, try to find any string value in the object
        if (!horoscopeText) {
          const values = Object.values(data);
          horoscopeText = values.find(val => typeof val === 'string' && val.length > 10) || '';
        }
      }
    }

    // Clean up the horoscope text
    if (horoscopeText) {
      horoscopeText = horoscopeText.trim();
      // Remove any HTML tags if present
      horoscopeText = horoscopeText.replace(/<[^>]*>/g, '');
      // Remove extra whitespace
      horoscopeText = horoscopeText.replace(/\s+/g, ' ');
    }

    // Validate we have meaningful content
    if (!horoscopeText || horoscopeText.length < 10) {
      throw new Error('No meaningful horoscope content received from API');
    }

    // Structure the response data
    const horoscopeData = {
      sign: sign.toLowerCase(),
      day: day.toLowerCase(),
      horoscope: horoscopeText,
      date: new Date().toISOString().split('T')[0],
      metadata: {
        source: 'Any.ge Horoscope API',
        fetchedAt: new Date().toISOString(),
        rawResponse: data,
        responseType: typeof data
      }
    };

    // Cache the result for current session
    horoscopeCache.set(cacheKey, horoscopeData);

    console.log(`[HoroscopeService] Successfully fetched horoscope for ${sign} - ${day}`);
    return horoscopeData;

  } catch (error) {
    console.error(`[HoroscopeService] Error fetching horoscope:`, error);
    
    // Check if this is a day availability issue and try fallback
    const isDayUnavailable = error.message.includes('This day might not be available') || 
                            error.message.includes('null data') ||
                            error.message.includes('empty response');
    
    if (isDayUnavailable && day !== 'today') {
      console.log(`[HoroscopeService] ${day} not available, trying today as fallback`);
      try {
        // Try to get today's horoscope as fallback
        const fallbackResult = await fetchDailyHoroscope(sign, 'today');
        if (fallbackResult && !fallbackResult.error) {
          return {
            ...fallbackResult,
            originalDay: day,
            fallbackUsed: true,
            fallbackMessage: `${day.charAt(0).toUpperCase() + day.slice(1)}'s horoscope is not available. Showing today's guidance instead.`
          };
        }
      } catch (fallbackError) {
        console.error(`[HoroscopeService] Fallback also failed:`, fallbackError);
      }
    }
    
    // Generate day-specific fallback messages
    const fallbackMessages = {
      today: 'The stars are aligning for you today. Stay positive and embrace new opportunities that come your way.',
      tomorrow: 'Tomorrow holds great potential for you. Trust your instincts and be open to new possibilities that may arise.',
      yesterday: 'Reflect on yesterday\'s experiences with wisdom. Every moment has taught you something valuable for your journey ahead.'
    };
    
    // Return error object with fallback message
    return {
      sign: sign?.toLowerCase() || 'unknown',
      day: day?.toLowerCase() || 'today',
      horoscope: null,
      error: true,
      errorMessage: error.message || 'Unable to load horoscope. Please try again later.',
      fallbackMessage: fallbackMessages[day?.toLowerCase()] || fallbackMessages.today
    };
  }
};

/**
 * Get zodiac sign by name
 */
export const getZodiacSign = (signKey) => {
  return ZODIAC_SIGNS.find(sign => sign.key === signKey.toLowerCase());
};

/**
 * Get day option by key
 */
export const getDayOption = (dayKey) => {
  return DAY_OPTIONS.find(day => day.key === dayKey.toLowerCase());
};

/**
 * Clear horoscope cache
 */
export const clearHoroscopeCache = () => {
  horoscopeCache.clear();
  console.log('[HoroscopeService] Cache cleared');
};

/**
 * Get cache size
 */
export const getCacheSize = () => {
  return horoscopeCache.size;
};

export default {
  fetchDailyHoroscope,
  getZodiacSign,
  getDayOption,
  clearHoroscopeCache,
  getCacheSize,
  ZODIAC_SIGNS,
  DAY_OPTIONS
};
