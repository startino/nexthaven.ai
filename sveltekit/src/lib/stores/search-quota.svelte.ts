export interface SearchQuotaInfo {
	isAnonymous: boolean;
	hasReachedLimit: boolean;
	remainingSearches: number;
	searchCount: number;
}

export let searchQuotaState: SearchQuotaInfo = $state({
	isAnonymous: false,
	hasReachedLimit: false,
	remainingSearches: 0,
	searchCount: 0
});
