import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GOOGLE_PLACES_API_KEY, GOOGLE_PLACES_ENDPOINTS, GOOGLE_PLACES_CONFIG } from '../config/googlePlaces';

/**
 * GooglePlacesInput - A custom Google Places Autocomplete component
 * Uses Google Places API to provide location suggestions as user types
 * Returns both the formatted place name and coordinates (lat/lng)
 */
const GooglePlacesInput = ({
  value = '',
  onLocationSelect,
  onFocus: onFocusProp,
  placeholder = 'Search for a location',
  style = {},
  inputStyle = {},
  listStyle = {},
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [error, setError] = useState(null);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  
  const debounceTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch place predictions from Google Places API
  const fetchPredictions = useCallback(async (searchText) => {
    if (!searchText || searchText.length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `${GOOGLE_PLACES_ENDPOINTS.autocomplete}?input=${encodeURIComponent(searchText)}&key=${GOOGLE_PLACES_API_KEY}&language=${GOOGLE_PLACES_CONFIG.language}&types=${GOOGLE_PLACES_CONFIG.types}&components=${GOOGLE_PLACES_CONFIG.components}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions);
        setShowPredictions(true);
        setError(null);
      } else if (data.status === 'ZERO_RESULTS') {
        setPredictions([]);
        setShowPredictions(false);
        setError(null);
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('Google Places API request denied:', data.error_message);
        console.error('Full API response:', JSON.stringify(data));
        // Allow manual entry when API is unavailable
        setError('Auto-search unavailable. You can type your location manually.');
        setPredictions([]);
        setShowPredictions(false);
        // Still allow the user to use the typed value
        if (onLocationSelect && searchText.length >= 2) {
          onLocationSelect({
            name: searchText,
            placeId: null,
            coordinates: null,
            formattedAddress: searchText,
            isManualEntry: true,
          });
        }
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('Google Places API query limit exceeded');
        setError('Search limit reached. You can type your location manually.');
        setPredictions([]);
        setShowPredictions(false);
      } else if (data.status === 'INVALID_REQUEST') {
        console.error('Google Places API invalid request:', data.error_message);
        setError(null);
        setPredictions([]);
      } else {
        console.log('Google Places API response:', data.status, data.error_message);
        setPredictions([]);
      }
    } catch (err) {
      console.error('Error fetching place predictions:', err);
      setError('Failed to fetch locations');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [onLocationSelect]);

  // Debounced search handler
  const handleTextChange = useCallback((text) => {
    setInputValue(text);
    
    // Always update parent with typed value for manual entry support
    // This ensures the form can work even if Google Places API is unavailable
    if (onLocationSelect && text.length >= 2) {
      onLocationSelect({
        name: text,
        placeId: null,
        coordinates: null,
        formattedAddress: text,
        isManualEntry: true,
      });
    } else if (onLocationSelect && text.length === 0) {
      onLocationSelect({
        name: '',
        placeId: null,
        coordinates: null,
        formattedAddress: '',
        isManualEntry: true,
      });
    }
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce API calls (300ms delay)
    debounceTimeoutRef.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  }, [fetchPredictions, onLocationSelect]);

  // Fetch place details to get coordinates
  const fetchPlaceDetails = useCallback(async (placeId) => {
    try {
      const url = `${GOOGLE_PLACES_ENDPOINTS.details}?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=formatted_address,geometry,name`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        return {
          formattedAddress: data.result.formatted_address || data.result.name,
          coordinates: {
            latitude: data.result.geometry?.location?.lat || null,
            longitude: data.result.geometry?.location?.lng || null,
          },
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching place details:', err);
      return null;
    }
  }, []);

  // Handle place selection
  const handlePlaceSelect = useCallback(async (prediction) => {
    // Prevent blur from hiding predictions while we're selecting
    setIsSelectingPlace(true);
    
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      // Get place details for coordinates
      const details = await fetchPlaceDetails(prediction.place_id);
      
      const locationName = prediction.description || prediction.structured_formatting?.main_text || '';
      console.log('📍 Setting location:', locationName);
      
      // Update local state
      setInputValue(locationName);
      setPredictions([]);
      setShowPredictions(false);

      // Call the callback with location data
      if (onLocationSelect) {
        onLocationSelect({
          name: locationName,
          placeId: prediction.place_id,
          coordinates: details?.coordinates || null,
          formattedAddress: details?.formattedAddress || locationName,
        });
      }
    } catch (err) {
      console.error('Error selecting place:', err);
    } finally {
      setIsLoading(false);
      setIsSelectingPlace(false);
    }
  }, [fetchPlaceDetails, onLocationSelect]);

  // Clear input
  const handleClear = useCallback(() => {
    setInputValue('');
    setPredictions([]);
    setShowPredictions(false);
    if (onLocationSelect) {
      onLocationSelect({
        name: '',
        placeId: null,
        coordinates: null,
        formattedAddress: '',
      });
    }
    inputRef.current?.focus();
  }, [onLocationSelect]);

  // Handle input blur
  const handleBlur = useCallback(() => {
    // Don't hide predictions if user is selecting a place
    if (isSelectingPlace) {
      return;
    }
    
    // Clear any existing blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    
    // Delay hiding predictions to allow tap on prediction item
    blurTimeoutRef.current = setTimeout(() => {
      if (!isSelectingPlace) {
        setShowPredictions(false);
      }
    }, 300);
  }, [isSelectingPlace]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    if (predictions.length > 0) {
      setShowPredictions(true);
    }
    // Call parent onFocus callback for scrolling
    if (onFocusProp) {
      onFocusProp();
    }
  }, [predictions.length, onFocusProp]);

  // Handle prediction item press - extracted for direct use
  const onPredictionPress = useCallback((item) => {
    console.log('📍 Prediction pressed:', item.description);
    handlePlaceSelect(item);
  }, [handlePlaceSelect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, style]}>
      {/* Input Field */}
      <View style={styles.inputContainer}>
        <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.textInput, inputStyle]}
          value={inputValue}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
        />
        {isLoading ? (
          <ActivityIndicator size="small" color="#F97316" style={styles.loadingIndicator} />
        ) : inputValue.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Error/Info Message */}
      {error && (
        <Text style={[styles.errorText, error.includes('manually') && styles.infoText]}>{error}</Text>
      )}

      {/* Predictions List */}
      {showPredictions && predictions.length > 0 && (
        <View style={[styles.predictionsContainer, listStyle]}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            style={styles.predictionsList}
          >
            {predictions.map((item) => (
              <Pressable
                key={item.place_id}
                style={({ pressed }) => [
                  styles.predictionItem,
                  pressed && styles.predictionItemPressed
                ]}
                onPress={() => onPredictionPress(item)}
              >
                <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.predictionIcon} />
                <View style={styles.predictionTextContainer}>
                  <Text style={styles.predictionMainText} numberOfLines={1}>
                    {item.structured_formatting?.main_text || item.description}
                  </Text>
                  {item.structured_formatting?.secondary_text && (
                    <Text style={styles.predictionSecondaryText} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
          {/* Google Attribution */}
          <View style={styles.attributionContainer}>
            <Text style={styles.attributionText}>Powered by Google</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: '#111827',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  infoText: {
    color: '#F97316', // Orange color for info/warning instead of red error
    fontStyle: 'italic',
  },
  predictionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 250,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  predictionsList: {
    maxHeight: 200,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  predictionItemPressed: {
    backgroundColor: '#F3F4F6',
  },
  predictionIcon: {
    marginRight: 12,
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionMainText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  predictionSecondaryText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  attributionContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attributionText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },
});

export default GooglePlacesInput;
