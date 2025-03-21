import React, { useState, useEffect } from "react";
import SearchScreen from "./components/SearchScreen";
import ComparisonScreen from "./components/ComparisonScreen";
import HomeScreen from "./components/HomeScreen";
import HistoryScreen from "./components/HistoryScreen";
import LoadingScreen from "./components/LoadingScreen";
import BookingScreen from "./components/BookingScreen";
import SubscriptionScreen from "./components/SubscriptionScreen";
import { Header } from "./components/Header";
import {
  AuthPage,
  SignInPage,
  SignUpPage,
  AccountPage,
} from "./components/auth";
import { propertyService } from "./services/api";
import { UnifiedProperty } from "./types/unified-property";
import {
  GA4_CONFIG,
  ANALYTICS_EVENTS,
  ANALYTICS_PARAMS,
} from "./config/analytics";
import { updateBrowserUrl } from "./utils/url";
import { useAuth } from "./context/AuthContext";

// Define Screen type
type Screen =
  | "home"
  | "search"
  | "loading"
  | "compare"
  | "history"
  | "booking"
  | "auth"
  | "signIn"
  | "signUp"
  | "account"
  | "subscription";

// This function is no longer needed as we're using UnifiedProperty directly
// const transformResponse = (property: PropertyResult): PropertyResult => {
//   return {
//     id: property.id,
//     url: property.url,
//     name: property.name,
//     price: property.price,
//     location: property.location,
//     rooms: property.rooms,
//     baths: property.baths,
//     amenities: property.amenities,
//     score: property.score,
//     image: property.image,
//     gallery: property.gallery,
//   };
// };

function App() {
  // Initialize state from URL parameters if available
  const getInitialScreen = (): Screen => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get("page");
    if (
      page &&
      [
        "home",
        "search",
        "loading",
        "compare",
        "history",
        "booking",
        "auth",
        "signIn",
        "signUp",
        "account",
        "subscription",
      ].includes(page)
    ) {
      return page as Screen;
    }
    return "home";
  };

  const [screen, setScreen] = useState<Screen>(getInitialScreen());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] =
    useState<UnifiedProperty | null>(null);
  const [topProperties, setTopProperties] = useState<UnifiedProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading, subscription } = useAuth();

  // Handle auth on page refresh
  useEffect(() => {
    // If we have URL parameters indicating we need to return to subscription page
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const canceled = urlParams.get("canceled");

    console.log(
      "App: Auth state on URL check:",
      user ? `User ${user.id} logged in` : "No user"
    );
    console.log("App: URL parameters:", { success, canceled });

    // If returning from checkout
    if ((success || canceled) && user) {
      console.log(
        "App: Returning from checkout, navigating to subscription page"
      );
      // Navigate to subscription page
      setScreen("subscription");
    }

    // Attempt to recover session if needed
    if (!user && !authLoading) {
      console.log(
        "App: No user detected but auth loading complete, checking session storage"
      );
      const storedRedirect = sessionStorage.getItem("redirectAfterAuth");
      if (storedRedirect) {
        console.log("App: Found stored redirect target:", storedRedirect);
      }
    }
  }, [user, authLoading]);

  // Update URL and track page views
  useEffect(() => {
    // Create parameters for the URL
    const urlParams: Record<string, string> = {};

    // Update browser URL
    updateBrowserUrl(screen, urlParams);

    // Send pageview to GA4
    if (GA4_CONFIG.ENABLED) {
      // Create analytics-specific parameters
      const analyticsParams = new URLSearchParams();
      analyticsParams.set(ANALYTICS_PARAMS.SCREEN, screen);

      if (screen === "search" && searchQuery) {
        analyticsParams.set(ANALYTICS_PARAMS.QUERY, searchQuery);
      }

      if (screen === "booking" && selectedProperty) {
        analyticsParams.set(
          ANALYTICS_PARAMS.PROPERTY_ID,
          String(selectedProperty.id)
        );
        analyticsParams.set(
          ANALYTICS_PARAMS.PROPERTY_NAME,
          selectedProperty.name
        );
        analyticsParams.set(
          ANALYTICS_PARAMS.PROPERTY_PRICE,
          String(selectedProperty.pricing.total)
        );
      }

      window.gtag?.("config", GA4_CONFIG.MEASUREMENT_ID, {
        debug_mode: GA4_CONFIG.DEBUG_MODE,
        page_path: `/${screen}?${analyticsParams.toString()}`,
        page_title: `nexthaven.ai - ${screen}`,
        page_location: window.location.href,
      });

      // Track screen view event
      window.gtag?.("event", ANALYTICS_EVENTS.PAGE_VIEW, {
        screen_name: screen,
        ...Object.fromEntries(analyticsParams),
      });
    }
  }, [screen, searchQuery, selectedProperty, topProperties]);

  // Redirect unauthenticated users from protected routes
  useEffect(() => {
    if (!authLoading) {
      const protectedScreens: Screen[] = [
        "compare",
        "history",
        "booking",
        "account",
      ];

      const subscriptionRequiredScreens: Screen[] = ["search"];

      // If user is not authenticated
      if (!user) {
        if (
          [...protectedScreens, ...subscriptionRequiredScreens].includes(screen)
        ) {
          // Save intended destination to redirect back after login
          sessionStorage.setItem("redirectAfterAuth", screen);
          setScreen("signIn");
        }
      }
      // If user is authenticated but doesn't have an active subscription
      else if (
        user &&
        !subscription.isActive &&
        subscriptionRequiredScreens.includes(screen)
      ) {
        // Save intended destination to redirect back after subscription
        sessionStorage.setItem("redirectAfterSubscription", screen);
        setScreen("subscription");
      }
      // If user is authenticated and has subscription (or accessing non-subscription route)
      else if (user) {
        // Check if we need to redirect after successful authentication
        const redirectScreen = sessionStorage.getItem(
          "redirectAfterAuth"
        ) as Screen | null;

        if (redirectScreen) {
          sessionStorage.removeItem("redirectAfterAuth");

          // Always redirect to home page after authentication
          setScreen("home");
        }

        // Check if we need to redirect after successful subscription
        const redirectAfterSubscription = sessionStorage.getItem(
          "redirectAfterSubscription"
        ) as Screen | null;

        if (redirectAfterSubscription && subscription.isActive) {
          sessionStorage.removeItem("redirectAfterSubscription");
          setScreen(redirectAfterSubscription);
        }
      }
    }
  }, [user, authLoading, screen, subscription.isActive]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setScreen("loading");
    setTopProperties([]); // Clear previous results
    setError(null); // Clear any previous errors

    try {
      console.log("Received search query:", query);
      const parsedQuery = JSON.parse(query);
      console.log("Parsed query:", parsedQuery);

      let properties: UnifiedProperty[] = [];

      // Check if we're using the new flow with session_id
      if (parsedQuery.sessionId) {
        console.log(
          "Using new API flow with session ID:",
          parsedQuery.sessionId
        );
        // Use the new API endpoint
        properties = await propertyService.evaluatePropertiesWithPreferences(
          parsedQuery.sessionId,
          parsedQuery.preferences
        );
      } else {
        console.log("Using legacy API flow");
        // Use the legacy API endpoint
        properties = await propertyService.evaluateProperties({
          query: parsedQuery.query || "",
          date: parsedQuery.date || "",
          budget: parsedQuery.budget || { min: 200, max: 600 },
          adults: parsedQuery.adults || 2,
          children: parsedQuery.children || 0,
          number_of_rooms: parsedQuery.number_of_rooms || 1,
          preferences: parsedQuery.preferences || "",
        });
      }

      console.log("Properties from API:", properties);

      if (properties.length === 0) {
        setError("No properties found. Please try a different search.");
        setScreen("search");
        return;
      }

      setTopProperties(properties);
      setScreen("compare");
    } catch (error) {
      console.error("Search error:", error);
      setError(
        `Search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setScreen("search");
    }
  };

  const handleStartNewCampaign = () => {
    setScreen("search");
    setTopProperties([]);
    setSelectedProperty(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleViewCampaign = (_id: number) => {
    // Implement viewing a saved campaign
    // Using underscore to indicate the parameter is intentionally unused
  };

  const handleWinnerSelected = (property: UnifiedProperty) => {
    setSelectedProperty(property);
    setScreen("booking");
  };

  const handleNavigate = (newScreen: Screen) => {
    setScreen(newScreen);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header onNavigate={handleNavigate} currentScreen={screen} />

      <div className="flex-grow">
        {screen === "home" && (
          <HomeScreen
            onStartNewCampaign={handleStartNewCampaign}
            onNavigateToAuth={() => setScreen("signIn")}
          />
        )}

        {screen === "search" && (
          <SearchScreen
            onSearch={handleSearch}
            error={error}
            onNavigateToAuth={() => setScreen("signIn")}
          />
        )}

        {screen === "loading" && <LoadingScreen />}

        {screen === "compare" && topProperties.length > 0 && (
          <ComparisonScreen
            properties={topProperties}
            onWinnerSelected={handleWinnerSelected}
            onBack={() => setScreen("search")}
          />
        )}

        {screen === "booking" && selectedProperty && (
          <BookingScreen
            property={selectedProperty}
            onBack={() => setScreen("compare")}
          />
        )}

        {screen === "history" && (
          <HistoryScreen
            onBack={() => setScreen("home")}
            onViewCampaign={handleViewCampaign}
          />
        )}

        {screen === "auth" && (
          <AuthPage
            onNavigate={(newScreen) => setScreen(newScreen as Screen)}
          />
        )}

        {screen === "signIn" && (
          <SignInPage
            onNavigate={(newScreen) => setScreen(newScreen as Screen)}
          />
        )}

        {screen === "signUp" && (
          <SignUpPage
            onNavigate={(newScreen) => setScreen(newScreen as Screen)}
          />
        )}

        {screen === "account" && (
          <AccountPage
            onNavigate={(newScreen) => setScreen(newScreen as Screen)}
          />
        )}

        {screen === "subscription" && (
          <SubscriptionScreen
            onNavigate={(newScreen) => setScreen(newScreen as Screen)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
