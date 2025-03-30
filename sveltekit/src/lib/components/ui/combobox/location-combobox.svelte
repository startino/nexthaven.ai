<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { MapPin, ChevronsUpDown, Loader2, AlertCircle } from 'lucide-svelte';
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';
  import { fly } from 'svelte/transition';
  import { Button } from '$lib/components/ui/button';

  // Types for Google Maps Places API
  type PlaceResult = {
    place_id: string;
    description: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  };

  type PlacesServiceStatus = 
    | 'OK'
    | 'ZERO_RESULTS'
    | 'OVER_QUERY_LIMIT'
    | 'REQUEST_DENIED'
    | 'INVALID_REQUEST'
    | 'UNKNOWN_ERROR';

  // Create a type for the window.google object
  interface GoogleMapsWindow extends Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => any;
          AutocompleteSessionToken: new () => any;
        }
      }
    }
  }

  // Props
  let {
    value = '',
    placeholder = 'Search for a location...',
    class: className = '',
    onSelect
  } = $props<{
    value?: string;
    placeholder?: string;
    class?: string;
    onSelect?: (location: { description: string; place_id: string }) => void;
  }>();

  // State
  let inputValue = $state(value);
  let places = $state<PlaceResult[]>([]);
  let isOpen = $state(false);
  let isLoading = $state(false);
  let isError = $state(false);
  let errorMessage = $state('Error loading suggestions. Please try again.');
  let autocompleteService: any = $state(null);
  let sessionToken: any = $state(null);
  let googleMapsLoaded = $state(false);
  let apiKeyStatus = $state('unverified');
  let inputElement: HTMLElement | null = $state(null);
  let highlightedIndex = $state<number>(-1);

  // Log the API key for debugging but redact part of it
  function logApiKey() {
    if (!PUBLIC_GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key is not set');
      return;
    }
    
    const key = PUBLIC_GOOGLE_MAPS_API_KEY;
    // Show only first 4 and last 4 characters
    const redactedKey = key.length > 8 
      ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
      : 'invalid key format';
    
    console.log(`Using Google Maps API Key: ${redactedKey}`);
  }

  // Function to load Google Maps API
  function loadGoogleMapsApi() {
    if (!browser) return Promise.resolve(false);
    
    logApiKey();
    
    // Check if already loaded
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      console.log('Google Maps API already loaded');
      return Promise.resolve(true);
    }
    
    return new Promise<boolean>((resolve) => {
      if (!PUBLIC_GOOGLE_MAPS_API_KEY || PUBLIC_GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        console.error('Valid Google Maps API key not configured');
        errorMessage = 'API key not configured. Please add a valid Google Maps API key.';
        resolve(false);
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      // Set a timeout in case the script hangs
      const timeoutId = setTimeout(() => {
        console.error('Google Maps API load timeout');
        errorMessage = 'API load timeout. Check your internet connection.';
        resolve(false);
      }, 10000);
      
      script.onload = () => {
        clearTimeout(timeoutId);
        console.log("Google Maps API loaded successfully");
        
        // Verify that the API is functional and the key works
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          console.error('Google Maps API not available after loading');
          errorMessage = 'API not available after loading. The API key may be invalid.';
          resolve(false);
          return;
        }
        
        resolve(true);
      };
      
      script.onerror = () => {
        clearTimeout(timeoutId);
        console.error('Failed to load Google Maps API');
        errorMessage = 'Failed to load API. The API key may be invalid or restricted.';
        resolve(false);
      };
      
      document.head.appendChild(script);
    });
  }

  // Initialize Google Maps Places API on component mount
  onMount(async () => {
    if (!browser) return;

    console.log("Mounting LocationCombobox component");
    googleMapsLoaded = await loadGoogleMapsApi();
    
    if (!googleMapsLoaded) {
      isError = true;
      console.error("Google Maps API failed to load");
      return;
    }
    
    try {
      const googleWindow = window as GoogleMapsWindow;
      sessionToken = new googleWindow.google.maps.places.AutocompleteSessionToken();
      autocompleteService = new googleWindow.google.maps.places.AutocompleteService();
      console.log("Google Maps services initialized");
      
      // Test the API with a simple request to verify the key works
      apiKeyStatus = 'testing';
      autocompleteService.getPlacePredictions(
        { input: 'New York' },
        (predictions: PlaceResult[] | null, status: PlacesServiceStatus) => {
          if (status === 'OK') {
            apiKeyStatus = 'verified';
            console.log('API key verified successfully');
          } else if (status === 'REQUEST_DENIED') {
            apiKeyStatus = 'denied';
            console.error('API key request denied. Key is likely invalid or restricted.');
            errorMessage = 'API key restricted. Google Maps Places API may be disabled for this key.';
            isError = true;
          } else if (status === 'INVALID_REQUEST') {
            // Try again with minimal parameters
            autocompleteService.getPlacePredictions(
              { input: 'New York' },
              (retryPredictions: PlaceResult[] | null, retryStatus: PlacesServiceStatus) => {
                if (retryStatus === 'OK') {
                  apiKeyStatus = 'verified';
                  console.log('API key verified successfully on retry');
                } else {
                  apiKeyStatus = 'error';
                  console.error('API key test returned unexpected status on retry:', retryStatus);
                }
              }
            );
          } else {
            apiKeyStatus = 'error';
            console.error('API key test returned unexpected status:', status);
          }
        }
      );
    } catch (error) {
      console.error("Error initializing Google Maps services:", error);
      isError = true;
      errorMessage = 'Error initializing services. Check console for details.';
    }
  });

  // Update input value when prop value changes
  $effect(() => {
    inputValue = value;
  });

  // Handle input changes
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    inputValue = target.value;
    highlightedIndex = -1;
    
    if (!autocompleteService || !googleMapsLoaded || inputValue.length < 2) {
      places = [];
      if (inputValue.length < 2) {
        isOpen = false;
      }
      return;
    }

    isLoading = true;
    isError = false;
    isOpen = true;
    
    try {
      console.log("Fetching place predictions for:", inputValue);
      const request: any = {
        input: inputValue,
      };
      
      if (sessionToken) {
        request.sessionToken = sessionToken;
      }
      
      // Use callback method instead of Promise to handle different response formats
      autocompleteService.getPlacePredictions(
        request,
        (predictions: PlaceResult[] | null, status: PlacesServiceStatus) => {
          isLoading = false;
          
          if (status !== 'OK' || !predictions) {
            console.error('Google Maps API returned status:', status);
            
            if (status === 'REQUEST_DENIED') {
              errorMessage = 'API access denied. The API key may be restricted.';
            } else if (status === 'OVER_QUERY_LIMIT') {
              errorMessage = 'Query limit exceeded. Try again later.';
            } else if (status === 'INVALID_REQUEST') {
              console.log('Invalid request. Retrying with simpler parameters...');
              
              // Try again with minimal parameters
              autocompleteService.getPlacePredictions(
                { 
                  input: inputValue 
                },
                (fallbackPredictions: PlaceResult[] | null, fallbackStatus: PlacesServiceStatus) => {
                  if (fallbackStatus === 'OK' && fallbackPredictions) {
                    console.log("Fallback place predictions received:", fallbackPredictions);
                    places = fallbackPredictions;
                  } else {
                    errorMessage = `Error: ${status || 'Unknown error'}`;
                    isError = true;
                    places = [];
                  }
                }
              );
              return;
            } else {
              errorMessage = `Error: ${status || 'Unknown error'}`;
            }
            
            isError = true;
            places = [];
            return;
          }
          
          console.log("Place predictions received:", predictions);
          places = predictions;
        }
      );
    } catch (error) {
      console.error('Error fetching place predictions:', error);
      isError = true;
      errorMessage = 'Failed to request suggestions. Try again later.';
      places = [];
      isLoading = false;
    }
  }

  // Handle location selection
  function handleSelectLocation(place: PlaceResult) {
    inputValue = place.description;
    isOpen = false;
    
    if (onSelect) {
      console.log("Location selected:", place);
      onSelect({
        description: place.description,
        place_id: place.place_id
      });
    }
    
    // Generate a new session token after selection for billing optimization
    if (googleMapsLoaded && browser) {
      try {
        const googleWindow = window as GoogleMapsWindow;
        sessionToken = new googleWindow.google.maps.places.AutocompleteSessionToken();
      } catch (error) {
        console.error("Error creating new session token:", error);
      }
    }
  }

  function toggleDropdown() {
    if (!isOpen && inputValue.length >= 2) {
      // If we have input text but no predictions yet, trigger a search
      if (places.length === 0 && inputValue.length >= 2) {
        // Instead of trying to dispatch event on input element
        // Just directly call our input handler with a simulated event
        const simulatedEvent = {
          target: { value: inputValue }
        } as Event;
        handleInput(simulatedEvent);
      }
    }
    isOpen = !isOpen;
  }

  function handleBlur(event: FocusEvent) {
    // Delay closing the dropdown to allow click events to fire first
    setTimeout(() => {
      isOpen = false;
    }, 200);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        isOpen = true;
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, places.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < places.length) {
          handleSelectLocation(places[highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        isOpen = false;
        break;
    }
  }
</script>

<div class={cn('relative w-full', className)}>
  <div class="relative">
    <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      bind:this={inputElement}
      value={inputValue}
      {placeholder}
      oninput={handleInput}
      onclick={() => {
        if (inputValue.length >= 2) toggleDropdown();
      }}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      class={cn('pl-10 pr-10 h-10', className)}
      aria-expanded={isOpen}
      aria-autocomplete="list"
      role="combobox"
    />
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onclick={toggleDropdown}
      aria-expanded={isOpen}
      class="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
      tabindex="-1"
    >
      <ChevronsUpDown class="h-4 w-4 opacity-50" />
      <span class="sr-only">Toggle menu</span>
    </Button>
  </div>
  
  {#if isOpen}
    <div
      class="absolute z-50 mt-1 max-h-[280px] w-full overflow-auto rounded-md border bg-card shadow-md outline-none animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      transition:fly={{ duration: 200, y: 5 }}
      role="listbox"
    >
      <div class="p-1">
        {#if isLoading}
          <div class="flex items-center justify-center p-6">
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        {:else if isError}
          <div class="py-6 text-center text-sm flex flex-col items-center gap-2">
            <AlertCircle class="h-5 w-5 text-destructive" />
            <span class="text-destructive">{errorMessage}</span>
          </div>
        {:else if places.length === 0}
          <div class="py-6 text-center text-sm text-muted-foreground">No results found.</div>
        {:else}
          <div class="space-y-0.5">
            {#each places as place, i (place.place_id)}
              <button
                class={cn(
                  "w-full relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
                  highlightedIndex === i && "bg-accent text-accent-foreground"
                )}
                role="option"
                aria-selected={highlightedIndex === i}
                onclick={() => handleSelectLocation(place)}
                onmouseenter={() => highlightedIndex = i}
              >
                <div class="flex flex-col truncate">
                  <span class="font-medium">{place.structured_formatting.main_text}</span>
                  <span class="text-xs text-muted-foreground truncate">{place.structured_formatting.secondary_text}</span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div> 