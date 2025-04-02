import { createParser, type EventSourceMessage } from 'eventsource-parser';
import type { UnifiedProperty } from './types/unified-property';
// import { v4 } from 'uuid';

export type PropertyEvaluationStatus = 'started' | 'in_progress' | 'completed';
export type PropertyEvaluationStep =
	| 'checking'
	| 'retrieving'
	| 'retrieved'
	| 'updating'
	| 'processing'
	| 'formatting';

export type PropertyEvaluationEventData = {
	event: string;
	status: PropertyEvaluationStatus;
	message: string;
	progress: number;
	step?: PropertyEvaluationStep;
	properties_count?: number;
	properties?: UnifiedProperty[];
	results?: UnifiedProperty[];
	count?: number;
	error?: string;
	processing_time?: string;
	performance_metrics?: {
		status_check_time: string;
		property_retrieval_time: string;
		requirements_update_time: string;
		evaluation_time: string;
		formatting_time: string;
		total_time: string;
	};
};

export type EventCallback = (eventData: PropertyEvaluationEventData) => void;

// Store for event subscribers
const subscribers: Map<string, EventCallback[]> = new Map();

// Function to subscribe to specific event types
export function subscribeToEvent(eventType: string, callback: EventCallback): () => void {
	if (!subscribers.has(eventType)) {
		subscribers.set(eventType, []);
	}

	subscribers.get(eventType)?.push(callback);

	// Return unsubscribe function
	return () => {
		const callbacks = subscribers.get(eventType);
		if (callbacks) {
			const index = callbacks.indexOf(callback);
			if (index !== -1) {
				callbacks.splice(index, 1);
			}
		}
	};
}

// Function to notify subscribers about an event
function notifySubscribers(eventType: string, data: PropertyEvaluationEventData) {
	const callbacks = subscribers.get(eventType);
	if (callbacks && callbacks.length > 0) {
		callbacks.forEach((callback) => callback(data));
	}
}

export const parser = createParser({
	onEvent: (event: EventSourceMessage) => {
		let eventData;

		try {
			eventData = JSON.parse(event.data);
		} catch (e) {
			console.error('Error parsing event data:', e);
			return;
		}

		switch (event.event) {
			case 'property_evaluation': {
				console.log('property_evaluation Data:\n', eventData);
				notifySubscribers('property_evaluation', eventData);
				break;
			}
			default: {
				console.log(`Unhandled event type: ${event.event}`);
				break;
			}
		}
	},
	onRetry: (interval: number) => {
		console.log('We should set reconnect interval to %d milliseconds', interval);
	}
});

export const streamEvents = async (res: Promise<Response>) => {
	await res.then((response) => {
		console.log('streamEvents: response');
		const stream = response.body;
		const reader = stream?.getReader();

		// TODO: This could be improved with further research of the SSE API
		const readChunk = () => {
			reader
				?.read()
				.then(({ value, done }) => {
					if (done) {
						console.log('streamEvents: finished');
						// shared.status = undefined;
						return;
					}

					const chunkData = new TextDecoder().decode(value);
					parser.feed(chunkData);
					readChunk();
				})
				.catch((error) => {
					console.error(`streamEvents: failed to read chunk: ${JSON.stringify(error, null, 2)}`);
					reader?.cancel();
				});
		};
		readChunk();
	});
};
