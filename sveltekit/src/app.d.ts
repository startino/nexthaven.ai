// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import { SupabaseClient, Session } from '@supabase/supabase-js';
import { Database } from '$lib/types/database.types';
import Stripe from 'stripe';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			session: Session | null;
			getSession: () => Promise<Session | null>;
			stripe: Stripe | null;
			subscriptionStatus: {
				isActive: boolean;
				planId?: string;
				planName?: string;
				currentPeriodEnd?: string;
				isInTrial?: boolean;
				trialEnd?: string;
				isAnonymous?: boolean;
			};
			isTrialEligible: boolean;
			hasExpiredTrial: boolean;
			isAnonymous: boolean;
			anonymousSearchInfo?: {
				isAnonymous: boolean;
				hasReachedLimit: boolean;
				remainingSearches: number;
				searchCount: number;
			};
		}
		interface PageData {
			session: Session | null;
			supabase: SupabaseClient<Database>;
			subscriptionStatus?: {
				isActive: boolean;
				planId?: string;
				planName?: string;
				currentPeriodEnd?: string;
				isInTrial?: boolean;
				trialEnd?: string;
				isAnonymous?: boolean;
			};
			isTrialEligible?: boolean;
			hasExpiredTrial?: boolean;
			isAnonymous?: boolean;
			anonymousSearchInfo?: {
				isAnonymous: boolean;
				hasReachedLimit: boolean;
				remainingSearches: number;
				searchCount: number;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		google: {
			maps: {
				places: {
					AutocompleteService: new () => google.maps.places.AutocompleteService;
					AutocompleteSessionToken: new () => google.maps.places.AutocompleteSessionToken;
				};
			};
		};
	}

	namespace google {
		namespace maps {
			namespace places {
				interface AutocompleteService {
					getPlacePredictions(
						request: AutocompletionRequest,
						callback?: (predictions: AutocompletePrediction[], status: PlacesServiceStatus) => void
					): Promise<AutocompletionResponse>;
				}

				interface AutocompleteSessionToken {}

				interface AutocompletePrediction {
					description: string;
					matched_substrings: PredictionSubstring[];
					place_id: string;
					reference: string;
					structured_formatting: StructuredFormatting;
					terms: PredictionTerm[];
					types: string[];
				}

				interface StructuredFormatting {
					main_text: string;
					main_text_matched_substrings: PredictionSubstring[];
					secondary_text: string;
				}

				interface PredictionTerm {
					offset: number;
					value: string;
				}

				interface PredictionSubstring {
					length: number;
					offset: number;
				}

				interface AutocompletionRequest {
					bounds?: any; // LatLngBounds | LatLngBoundsLiteral
					componentRestrictions?: ComponentRestrictions;
					input: string;
					location?: any; // LatLng
					offset?: number;
					origin?: any; // LatLng | LatLngLiteral
					radius?: number;
					sessionToken?: AutocompleteSessionToken;
					types?: string[];
				}

				interface AutocompletionResponse {
					predictions: AutocompletePrediction[];
				}

				interface ComponentRestrictions {
					country: string | string[];
				}

				type PlacesServiceStatus =
					| 'OK'
					| 'ZERO_RESULTS'
					| 'OVER_QUERY_LIMIT'
					| 'REQUEST_DENIED'
					| 'INVALID_REQUEST'
					| 'UNKNOWN_ERROR';
			}
		}
	}
}

export {};
