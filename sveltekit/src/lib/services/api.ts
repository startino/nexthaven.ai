import { PUBLIC_API_URL } from '$env/static/public';
import type { UnifiedProperty } from '$lib/types/unified-property';

interface Budget {
	min: number;
	max: number;
}

// Base request interface with common properties
interface BasePropertyRequest {
	query: string;
	date: string;
	budget: Budget;
	adults: number;
	children: number;
	number_of_rooms: number;
}

// Request for the query endpoint (step 2)
interface PropertyQueryRequest extends BasePropertyRequest {}

// Request for the evaluate endpoint (step 3)
interface PropertyEvaluationRequest {
	session_id: string;
	preferences: string;
}

// Legacy request interface (kept for backward compatibility)
interface LegacyPropertyEvaluationRequest extends BasePropertyRequest {
	preferences: string;
}

// Response from the query endpoint
interface PropertyQueryResponse {
	status: string;
	message: string;
	session_id: string;
}

// Response from the status endpoint
interface PropertyQueryStatusResponse {
	status: string;
	message?: string;
	started_at?: number;
	completed?: boolean;
	completed_at?: number;
	properties_count?: number;
	error?: string;
}

// Response from the evaluate endpoint
interface PropertyEvaluationResponse {
	status: string;
	message: string;
	count: number;
	results: UnifiedProperty[]; // Now expecting UnifiedProperty objects directly
	processing_time: string;
}

const API_BASE_URL = PUBLIC_API_URL || 'http://localhost:8000';

// Transform functions for different request types
const transformQueryRequest = (payload: PropertyQueryRequest) => {
	return {
		query: payload.query,
		date: payload.date,
		budget: {
			min: payload.budget.min,
			max: payload.budget.max
		},
		adults: payload.adults,
		children: payload.children,
		number_of_rooms: payload.number_of_rooms
	};
};

const transformEvaluationRequest = (sessionId: string, preferences: string) => {
	return {
		session_id: sessionId,
		preferences: preferences
	};
};

// Legacy transform function (kept for backward compatibility)
const transformLegacyRequest = (payload: LegacyPropertyEvaluationRequest) => {
	return {
		query: payload.query,
		date: payload.date,
		budget: {
			min: payload.budget.min,
			max: payload.budget.max
		},
		adults: payload.adults,
		children: payload.children,
		number_of_rooms: payload.number_of_rooms,
		preferences: payload.preferences
	};
};

/**
 * Service for interacting with the property API endpoints
 */
export const propertyService = {
	/**
	 * Query for properties with given parameters
	 * This starts the search process
	 */
	async queryProperties(payload: PropertyQueryRequest): Promise<PropertyQueryResponse> {
		try {
			const response = await fetch(`${API_BASE_URL}/properties/query`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(transformQueryRequest(payload))
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Failed to query properties: ${error}`);
			}

			return await response.json();
		} catch (error) {
			console.error('Error querying properties:', error);
			throw error;
		}
	},

	/**
	 * Check the status of a property query
	 */
	async checkQueryStatus(sessionId: string): Promise<PropertyQueryStatusResponse> {
		try {
			const response = await fetch(`${API_BASE_URL}/properties/status/${sessionId}`);

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Failed to check query status: ${error}`);
			}

			return await response.json();
		} catch (error) {
			console.error('Error checking query status:', error);
			throw error;
		}
	},

	/**
	 * Evaluate properties with user preferences
	 */
	async evaluatePropertiesWithPreferences(
		sessionId: string,
		preferences: string
	): Promise<Response> {
		return await fetch(`${API_BASE_URL}/properties/evaluate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Connection: 'keep-alive' },
			body: JSON.stringify(transformEvaluationRequest(sessionId, preferences))
		});
	},

	/**
	 * Legacy endpoint: Evaluate properties all in one step (backwards compatibility)
	 */
	// async evaluateProperties(payload: LegacyPropertyEvaluationRequest): Promise<UnifiedProperty[]> {
	// 	try {
	// 		const response = await fetch(`${API_BASE_URL}/properties/evaluateAll`, {
	// 			method: 'POST',
	// 			headers: { 'Content-Type': 'application/json' },
	// 			body: JSON.stringify(transformLegacyRequest(payload))
	// 		});

	// 		if (!response.ok) {
	// 			const error = await response.text();
	// 			throw new Error(`Failed to evaluate properties: ${error}`);
	// 		}

	// 		const data: PropertyEvaluationResponse = await response.json();
	// 		return data.results;
	// 	} catch (error) {
	// 		console.error('Error evaluating properties:', error);
	// 		throw error;
	// 	}
	// }
};

const handleCallExpert = async (): Promise<Response> => {
	body = {};

	return fetch(`${getURL(PUBLIC_API_URL)}experts/call`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Connection: 'keep-alive'
		},
		body: JSON.stringify(body)
	});
};
