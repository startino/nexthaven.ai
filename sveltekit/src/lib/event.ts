import { createParser, type EventSourceMessage } from 'eventsource-parser';
// import type { UnifiedProperty } from './types/unified-property';
// import { v4 } from 'uuid';

export type CustomEventHandler = (eventData: any) => void;

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
