/**
 * Creates a query string from the current screen and additional parameters
 * @param screen The current screen/page
 * @param params Additional parameters to include in the URL
 * @returns A formatted query string
 */
export function createQueryString(screen: string, params: Record<string, string> = {}): string {
  const urlParams = new URLSearchParams();
  
  // Always include the page parameter
  urlParams.set('page', screen);
  
  // Add all additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      urlParams.set(key, value);
    }
  });
  
  return urlParams.toString();
}

/**
 * Updates the browser URL without causing a page reload
 * @param screen The current screen/page
 * @param params Additional parameters to include in the URL
 */
export function updateBrowserUrl(screen: string, params: Record<string, string> = {}): void {
  const queryString = createQueryString(screen, params);
  const newUrl = `${window.location.pathname}?${queryString}`;
  window.history.replaceState({}, '', newUrl);
} 