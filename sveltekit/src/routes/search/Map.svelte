<!-- 
  Map.svelte - Interactive Google Maps component that displays property markers
  Shows properties on the map with color-coded markers based on score
-->
<script lang="ts">
  // @ts-ignore - Ignore TypeScript errors for Google Maps API
  import { onMount } from 'svelte';
  import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';
  import type { UnifiedProperty } from '$lib/types/unified-property';
  import { Info } from 'lucide-svelte';
  
  // Immediately log when the component script is executed
  console.log('MAP COMPONENT SCRIPT EXECUTED');
  
  // Properties that can be bound to from parent component
  let { 
    properties = $bindable([]), 
    selectedLocation = $bindable(''),
    height = $bindable('100%')
  } = $props();
  
  // DEBUGGING - Track every time the selected location is updated
  $effect(() => {
    console.log('### LOCATION UPDATE DETECTED (root effect): ', selectedLocation);
  });
  
  // Internal state variables
  let map: any; // Google Map instance
  let markers: any[] = []; // Array to track created markers
  let mapElement: HTMLElement; // Reference to the map container element
  let isMapLoaded = $state(false);
  let isScriptLoaded = $state(false);
  let hasMapError = $state(false);
  let errorMessage = $state('');
  let mapInitializationAttempted = $state(false);
  let pendingProperties = $state<UnifiedProperty[]>([]);
  let hasAttemptedToUpdateMarkers = $state(false);
  let geocoder: any; // Geocoder for looking up locations
  let geocodedLocations = $state<Record<string, {lat: number, lng: number}>>({});
  let previousLocation = $state('');
  
  console.log('MAP COMPONENT: Initial properties:', { 
    propertiesCount: properties?.length || 0,
    selectedLocation: selectedLocation || 'None',
    apiKey: PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'
  });
  
  // Map initialization options - using default styling
  const defaultMapOptions = {
    zoom: 12,
    center: { lat: 13.7563, lng: 100.5018 }, // Default to Bangkok
    mapTypeControl: false, // Disable map type controls
    fullscreenControl: false, // Disable fullscreen control
    streetViewControl: false, // Disable street view
    zoomControl: true, // Keep zoom controls
  };
  
  // Color gradient for scores (0-100)
  const getMarkerColor = (score: number): string => {
    if (score >= 90) return '#4CAF50'; // Green
    if (score >= 80) return '#8BC34A'; // Light Green
    if (score >= 70) return '#CDDC39'; // Lime
    if (score >= 60) return '#FFEB3B'; // Yellow
    if (score >= 50) return '#FFC107'; // Amber
    if (score >= 40) return '#FF9800'; // Orange
    return '#F44336'; // Red for below 40
  };
  
  // Legend configuration for score colors
  const scoreLegend = [
    { label: '90-100', color: '#4CAF50' },
    { label: '80-89', color: '#8BC34A' },
    { label: '70-79', color: '#CDDC39' },
    { label: '60-69', color: '#FFEB3B' },
    { label: '50-59', color: '#FFC107' },
    { label: '40-49', color: '#FF9800' },
    { label: '0-39', color: '#F44336' }
  ];
  
  // Load Google Maps with geocoding library
  function loadGoogleMapsScript() {
    console.log('MAP COMPONENT: Attempting to load Google Maps script');
    
    // Check for API key
    if (!PUBLIC_GOOGLE_MAPS_API_KEY) {
      const errorMsg = 'Google Maps API key is missing';
      console.error('MAP COMPONENT:', errorMsg);
      hasMapError = true;
      errorMessage = errorMsg;
      return;
    }
    
    // Check if the script is already loaded
    // @ts-ignore - Checking if google is defined
    if (typeof google !== 'undefined' && google.maps) {
      console.log('MAP COMPONENT: Google Maps API already loaded, initializing map directly');
      isScriptLoaded = true;
      initializeMap();
      return;
    }
    
    // Return if the script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
      console.log('MAP COMPONENT: Google Maps script already loading, waiting for it to load');
      
      // Set up a global callback to initialize our map when Google Maps loads
      // @ts-ignore
      const originalInitMap = window.initMap;
      // @ts-ignore
      window.initMap = () => {
        // Call the original callback if it exists
        if (originalInitMap) originalInitMap();
        
        console.log('MAP COMPONENT: Google Maps script finished loading via callback');
        isScriptLoaded = true;
        initializeMap();
      };
      
      return;
    }
    
    try {
      // Set up a timeout for script loading
      const scriptLoadTimeout = setTimeout(() => {
        console.error('MAP COMPONENT: Google Maps script load timed out');
        hasMapError = true;
        errorMessage = 'Failed to load Google Maps. The script load timed out.';
      }, 10000); // 10 second timeout
      
      // Define the global callback function before adding the script
      // @ts-ignore - Ignore TypeScript error for window.initMap
      window.initMap = () => {
        console.log('MAP COMPONENT: Google Maps script loaded successfully via callback');
        clearTimeout(scriptLoadTimeout);
        isScriptLoaded = true;
        initializeMap();
      };
      
      // Important: Correctly include the geocoding library
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      console.log('MAP COMPONENT: Creating script element with API key and geocoding library');
      
      // Handle script loading errors
      script.onerror = (error) => {
        clearTimeout(scriptLoadTimeout);
        console.error('MAP COMPONENT: Error loading Google Maps script', error);
        hasMapError = true;
        errorMessage = 'Failed to load Google Maps. Please check your API key and connection.';
      };
      
      // Add the script to the document
      document.head.appendChild(script);
      console.log('MAP COMPONENT: Google Maps script added to document head');
    } catch (scriptError) {
      console.error('MAP COMPONENT: Error setting up script:', scriptError);
      hasMapError = true;
      errorMessage = 'Error setting up Google Maps. Please refresh and try again.';
    }
  }
  
  // Initialize the map
  function initializeMap() {
    console.log('MAP COMPONENT: Initializing map...');
    
    // Prevent multiple initialization attempts
    if (mapInitializationAttempted) {
      console.log('MAP COMPONENT: Map initialization already attempted, skipping');
      return;
    }
    
    mapInitializationAttempted = true;
    
    if (!mapElement) {
      console.error('MAP COMPONENT: Map element reference is missing');
      hasMapError = true;
      errorMessage = 'Map container element not found. Please refresh the page.';
      return;
    }
    
    if (!isScriptLoaded) {
      console.error('MAP COMPONENT: Google Maps script not yet loaded');
      return;
    }
    
    try {
      // Double check if Google Maps is globally available
      // @ts-ignore - Checking if google is defined
      if (typeof google === 'undefined' || !google.maps) {
        throw new Error('Google Maps API not available');
      }
      
      // Make sure the map element is visible and has dimensions
      if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
        console.warn('MAP COMPONENT: Map container has zero width or height');
      }
      
      console.log('MAP COMPONENT: Creating Google Map instance');
      
      // @ts-ignore - Ignore TypeScript error for Google Maps API
      map = new google.maps.Map(mapElement, defaultMapOptions);
      
      // Create geocoder instance for looking up locations
      // @ts-ignore - Ignore TypeScript error for Google Maps API
      geocoder = new google.maps.Geocoder();
      console.log('MAP COMPONENT: Geocoder created');
      
      // Listen for the map idle event to confirm it's fully loaded
      // @ts-ignore - Ignore TypeScript error for Google Maps API
      google.maps.event.addListenerOnce(map, 'idle', () => {
        console.log('MAP COMPONENT: Map is fully loaded and idle');
        isMapLoaded = true;
        
        // Immediately log current selected location
        console.log('MAP COMPONENT: Selected location after map idle:', selectedLocation);
        
        // Center on selected location if we have one
        if (selectedLocation) {
          console.log('MAP COMPONENT: Centering on selected location after map is idle:', selectedLocation);
          centerMapOnLocation(selectedLocation);
        } else {
          console.log('MAP COMPONENT: No selected location to center on after map is idle');
        }
        
        // Process any properties that arrived while the map was loading
        if (properties.length > 0) {
          console.log(`MAP COMPONENT: Processing ${properties.length} properties after map is idle`);
          updateMarkers();
        }
      });
      
      // Listen for the tilesloaded event as a fallback
      // @ts-ignore - Ignore TypeScript error for Google Maps API
      google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
        if (!isMapLoaded) {
          console.log('MAP COMPONENT: Map tiles loaded');
          isMapLoaded = true;
          
          // Center on selected location if we have one
          if (selectedLocation && selectedLocation !== previousLocation) {
            console.log('MAP COMPONENT: Selected location found after tiles loaded:', selectedLocation);
            centerMapOnLocation(selectedLocation);
          } else {
            console.log('MAP COMPONENT: No selected location to center on after tiles loaded');
          }
          
          // Process any properties that arrived while the map was loading
          if (properties.length > 0 && !hasAttemptedToUpdateMarkers) {
            console.log(`MAP COMPONENT: Processing ${properties.length} properties after tiles loaded`);
            updateMarkers();
          }
        }
      });
      
    } catch (error) {
      console.error('MAP COMPONENT: Error initializing map:', error);
      hasMapError = true;
      errorMessage = 'Failed to initialize the map. Please refresh and try again.';
    }
  }
  
  // Function to center the map on a specific location
  function centerMapOnLocation(location: string) {
    console.log('MAP COMPONENT: Attempting to center map on location:', location);
    
    // Skip if no map, no location, or it's an empty string
    if (!map || !location || location.trim() === '') {
      console.log('MAP COMPONENT: Skipping centerMapOnLocation - invalid inputs');
      return;
    }
    
    // Check if we've already geocoded this location
    if (geocodedLocations[location]) {
      console.log('MAP COMPONENT: Using cached coordinates for:', location, geocodedLocations[location]);
      map.setCenter(geocodedLocations[location]);
      map.setZoom(12); // Reset to a reasonable zoom level
      previousLocation = location;
      return;
    }
    
    // Skip if no geocoder
    if (!geocoder) {
      console.error('MAP COMPONENT: Geocoder not available');
      return;
    }
    
    try {
      console.log('MAP COMPONENT: Geocoding location with Geocoder:', location);
      
      // Geocode the address using the Google Maps Geocoder
      geocoder.geocode({ 'address': location }, (results: any, status: any) => {
        console.log('MAP COMPONENT: Geocoding returned status:', status);
        
        if (status === 'OK' && results && results.length > 0) {
          const { location: coordinates } = results[0].geometry;
          const coords = {
            lat: coordinates.lat(),
            lng: coordinates.lng()
          };
          
          // Store the geocoded location for future use
          geocodedLocations = {
            ...geocodedLocations,
            [location]: coords
          };
          
          console.log('MAP COMPONENT: Successfully geocoded:', location, coords);
          
          // Center the map on the geocoded location
          map.setCenter(coords);
          map.setZoom(12); // Reset to a reasonable zoom level
          previousLocation = location;
        } else {
          console.error('MAP COMPONENT: Geocoding failed with status:', status);
          
          // Fall back to default location if geocoding fails
          if (hasValidCoordinatesInProperties()) {
            console.log('MAP COMPONENT: Falling back to property coordinates');
            fitMapToProperties();
          }
        }
      });
    } catch (error) {
      console.error('MAP COMPONENT: Error geocoding location:', error);
    }
  }
  
  // Helper to check if any properties have valid coordinates
  function hasValidCoordinatesInProperties(): boolean {
    return properties.some(property => 
      property.coordinates && 
      property.coordinates.lat && 
      property.coordinates.lng
    );
  }
  
  // Helper to fit map to all properties with coordinates
  function fitMapToProperties() {
    if (!map || !properties.length) return;
    
    try {
      // @ts-ignore - Ignore TypeScript error for Google Maps API
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoordinates = false;
      
      // Add all valid property positions to bounds
      properties.forEach(property => {
        if (property.coordinates && property.coordinates.lat && property.coordinates.lng) {
          bounds.extend({
            lat: property.coordinates.lat,
            lng: property.coordinates.lng
          });
          hasValidCoordinates = true;
        }
      });
      
      // Fit map to bounds if we have any valid coordinates
      if (hasValidCoordinates) {
        map.fitBounds(bounds);
        
        // If we only have one property, zoom out a bit
        if (properties.filter(p => p.coordinates?.lat && p.coordinates?.lng).length === 1) {
          map.setZoom(14);
        }
      }
    } catch (error) {
      console.error('MAP COMPONENT: Error fitting map to properties:', error);
    }
  }
  
  // Add or update markers for all properties
  function updateMarkers() {
    console.log('MAP COMPONENT: Updating markers...');
    hasAttemptedToUpdateMarkers = true;
    
    if (!map) {
      console.error('MAP COMPONENT: Map instance not available');
      return;
    }
    
    if (!isMapLoaded) {
      console.error('MAP COMPONENT: Map not fully loaded yet, storing properties for later');
      pendingProperties = [...properties];
      return;
    }
    
    try {
      // Clear existing markers
      if (markers.length > 0) {
        console.log(`MAP COMPONENT: Clearing ${markers.length} existing markers`);
        markers.forEach(marker => marker.setMap(null));
      }
      markers = [];
      
      // Return early if no properties
      if (!properties || properties.length === 0) {
        console.log('MAP COMPONENT: No properties to display');
        return;
      }
      
      // Debug log properties count
      console.log(`MAP COMPONENT: Processing ${properties.length} properties for markers`);
      
      // Prepare for bounds calculation
      // @ts-ignore - Ignore TypeScript error for Google Maps API
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoordinates = false;
      let propertiesWithCoords = 0;
      let propertiesWithoutCoords = 0;
      
      // Process each property
      properties.forEach((property, index) => {
        // Skip properties without coordinates
        if (!property.coordinates || !property.coordinates.lat || !property.coordinates.lng) {
          propertiesWithoutCoords++;
          console.log(`MAP COMPONENT: Property missing coordinates:`, property.name || 'unnamed property');
          return;
        }
        
        propertiesWithCoords++;
        const position = {
          lat: property.coordinates.lat,
          lng: property.coordinates.lng
        };
        
        console.log(`MAP COMPONENT: Adding marker for property at:`, position);
        hasValidCoordinates = true;
        
        // Add position to bounds
        bounds.extend(position);
        
        try {
          // Determine marker color based on score
          const score = property.score || 0;
          const markerColor = getMarkerColor(score);
          
          // Create a simple marker
          // @ts-ignore - Ignore TypeScript error for Google Maps API
          const marker = new google.maps.Marker({
            position,
            map,
            title: property.name || 'Property',
            label: {
              text: Math.round(score).toString(),
              color: '#FFFFFF',
              fontWeight: 'bold'
            },
            icon: {
              path: 'M-8,0a8,8 0 1,0 16,0a8,8 0 1,0 -16,0',
              fillColor: markerColor,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              scale: 1.2
            }
          });
          
          // Keep track of the marker
          markers.push(marker);
          
          // Create info window content
          const infoContent = document.createElement('div');
          infoContent.className = 'info-window-content';
          infoContent.innerHTML = `
            <div class="info-window-inner">
              <div class="info-header">
                <h3 class="info-title">${property.name || 'Unnamed Property'}</h3>
                <div class="info-score">Score: <strong>${Math.round(score)}/100</strong></div>
              </div>
              <div class="info-price">$${Math.round(property.pricing?.total || 0)}</div>
              <div class="info-location">${property.location || 'Unknown location'}</div>
            </div>
          `;
          
          // Add Tailwind styling
          infoContent.querySelector('.info-window-inner')?.classList.add('p-3', 'max-w-xs');
          infoContent.querySelector('.info-header')?.classList.add('border-b', 'pb-2', 'mb-2');
          infoContent.querySelector('.info-title')?.classList.add('font-bold', 'text-gray-900', 'mb-1');
          infoContent.querySelector('.info-score')?.classList.add('text-sm', 'text-gray-700');
          infoContent.querySelector('.info-price')?.classList.add('text-lg', 'font-bold', 'text-blue-600', 'mb-1');
          infoContent.querySelector('.info-location')?.classList.add('text-sm', 'text-gray-600');
          
          // Create info window
          // @ts-ignore - Ignore TypeScript error for Google Maps API
          const infoWindow = new google.maps.InfoWindow({
            content: infoContent,
            maxWidth: 300
          });
          
          // Add click listener to open info window
          marker.addListener('click', () => {
            infoWindow.open({
              anchor: marker,
              map
            });
          });
          
        } catch (markerError) {
          console.error(`MAP COMPONENT: Error creating marker:`, markerError);
        }
      });
      
      console.log(`MAP COMPONENT: Marker creation summary: ${propertiesWithCoords} with coordinates, ${propertiesWithoutCoords} without coordinates`);
      
      // Adjust map view to show all markers if we have any valid coordinates
      if (hasValidCoordinates && markers.length > 0) {
        // If we have a selectedLocation, prioritize centering on that instead of fitting to markers
        if (!selectedLocation) {
          console.log(`MAP COMPONENT: No selected location - fitting map to ${markers.length} markers`);
          map.fitBounds(bounds);
          
          // If we only have one marker, zoom out a bit
          if (markers.length === 1) {
            map.setZoom(14);
            console.log('MAP COMPONENT: Setting zoom to 14 for single marker');
          }
        }
      } else {
        console.log('MAP COMPONENT: No valid markers to display on map');
      }
    } catch (error) {
      console.error('MAP COMPONENT: Error updating markers:', error);
    }
  }
  
  // Watch for property changes to update markers
  $effect(() => {
    console.log(`MAP COMPONENT: Properties changed, count:`, properties?.length || 0);
    if (properties && isMapLoaded) {
      updateMarkers();
    } else if (properties && properties.length > 0 && map && !isMapLoaded) {
      // Store properties for when the map is loaded
      console.log('MAP COMPONENT: Storing properties for when map is ready');
      pendingProperties = [...properties];
    }
  });
  
  // Watch for map loaded state changes
  $effect(() => {
    if (isMapLoaded && pendingProperties.length > 0) {
      console.log('MAP COMPONENT: Map loaded, processing pending properties');
      updateMarkers();
    }
  });
  
  // Watch for selectedLocation changes
  $effect(() => {
    console.log(`MAP COMPONENT: selectedLocation effect triggered: "${selectedLocation}" (prev: "${previousLocation}")`);
    
    // DEBUG: Always log selected location change, even if it's the same
    if (selectedLocation) {
      console.log('MAP COMPONENT: Selected location is present:', selectedLocation);
    } else {
      console.log('MAP COMPONENT: Selected location is empty or undefined');
    }
    
    if (selectedLocation && selectedLocation !== previousLocation) {
      // Log map and geocoder state
      console.log('MAP COMPONENT: Map loaded?', isMapLoaded, 'Geocoder available?', !!geocoder);
      
      if (isMapLoaded && map && geocoder) {
        console.log('MAP COMPONENT: Selected location changed, centering map on:', selectedLocation);
        centerMapOnLocation(selectedLocation);
      } else {
        console.log('MAP COMPONENT: Selected location changed but map not ready yet, will center when ready');
      }
    }
  });
  
  // Force check of selected location whenever the map becomes ready
  $effect(() => {
    if (isMapLoaded && selectedLocation) {
      console.log('MAP COMPONENT: Map just loaded and selected location exists, centering map');
      centerMapOnLocation(selectedLocation);
    }
  });
  
  // Initialize the map when the component mounts
  onMount(() => {
    console.log('MAP COMPONENT: Component mounted, selected location:', selectedLocation);
    
    // Load script with a small delay to ensure DOM is ready
    setTimeout(() => {
      loadGoogleMapsScript();
    }, 200);
    
    // Clean up resources when component is unmounted
    return () => {
      console.log('MAP COMPONENT: Component unmounting, cleaning up resources');
      
      // Clear markers
      if (markers && markers.length) {
        markers.forEach(marker => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
      }
      
      // No need to try to clear event listeners as they'll be garbage collected
      // when the map is destroyed
    };
  });
  
  // Find current location function
  function findCurrentLocation() {
    console.log('MAP COMPONENT: Finding current location...');
    if (!map) {
      console.error('MAP COMPONENT: Map not available for current location');
      return;
    }
    
    if (!navigator.geolocation) {
      console.error('MAP COMPONENT: Geolocation not supported by browser');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('MAP COMPONENT: Current location found:', pos);
        map.setCenter(pos);
        map.setZoom(14); // Set appropriate zoom level for user location
      },
      (error) => {
        console.error('MAP COMPONENT: Geolocation service failed:', error);
      }
    );
  }
</script>

<div class="relative w-full min-h-[200px] rounded overflow-hidden" style="height: {height}">
  {#if hasMapError}
    <div class="flex flex-col items-center justify-center h-full p-4 text-center bg-gray-100 text-gray-700">
      <Info size={24} class="mb-2 text-gray-500" />
      <p class="mb-4">{errorMessage}</p>
      <button 
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" 
        onclick={() => {
          console.log('MAP COMPONENT: Retry button clicked');
          hasMapError = false;
          mapInitializationAttempted = false;
          loadGoogleMapsScript();
        }}
        type="button"
      >
        Retry
      </button>
    </div>
  {:else}
    <div bind:this={mapElement} class="w-full h-full" data-testid="google-map-container"></div>
    
    <!-- Map Legend -->
    <div class="absolute top-2 left-2 bg-white rounded p-2 shadow-md z-10 text-xs">
      <div class="font-semibold mb-1 text-sm text-gray-800">Score Legend</div>
      <div class="flex flex-col gap-1">
        {#each scoreLegend as item}
          <div class="flex items-center gap-1.5">
            <div class="w-3 h-3 rounded" style="background-color: {item.color}"></div>
            <div class="text-xs text-gray-700">{item.label}</div>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Debug Info -->
    <div class="absolute bottom-2 left-2 bg-white/90 rounded px-2 py-1 shadow-sm z-10 text-xs max-w-[80%] truncate">
      <p class="text-gray-800">Current Location: <span class="font-medium">{selectedLocation || 'None'}</span></p>
    </div>
    
    <!-- Current Location Button -->
    <button 
      class="absolute bottom-5 right-3 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-gray-50 z-10"
      onclick={findCurrentLocation} 
      type="button"
      aria-label="Find my location"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-700">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="4"></circle>
        <line x1="12" y1="2" x2="12" y2="4"></line>
        <line x1="12" y1="20" x2="12" y2="22"></line>
        <line x1="22" y1="12" x2="20" y2="12"></line>
        <line x1="4" y1="12" x2="2" y2="12"></line>
      </svg>
    </button>
  {/if}
</div>

<style>
  /* We'll use Tailwind for most styling, but keep global styles for Google Maps info windows */
  :global(.info-window-content) {
    font-family: system-ui, -apple-system, sans-serif;
  }
</style> 