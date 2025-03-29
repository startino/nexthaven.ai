// Constants for time frames and durations
export const timeFrames = ['Next Week', 'Two Weeks', 'Next Month'];
export const durations = ['1 Week', '1 Month', '3 Months'];

// Calculate start date based on selected time frame
export function calculateStartDate(timeFrame: string): string {
  let now = new Date();
  
  if (timeFrame === 'Next Week') {
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek.toISOString().split('T')[0];
  } else if (timeFrame === 'Two Weeks') {
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return twoWeeks.toISOString().split('T')[0];
  } else if (timeFrame === 'Next Month') {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return nextMonth.toISOString().split('T')[0];
  }
  
  return '';
}

// Format date range based on time frame and duration
export function formatDateRange(timeFrame: string, duration: string): string {
  if (!timeFrame && !duration) return '';
  
  if (timeFrame && duration) {
    return `${timeFrame} for ${duration}`;
  } else if (timeFrame) {
    return timeFrame;
  } else if (duration) {
    return `for ${duration}`;
  }
  
  return '';
}

// Parse a date range string into timeframe and duration components
export function parseDateRange(dateRange: string): { timeFrame: string | null; duration: string | null } {
  if (!dateRange) return { timeFrame: null, duration: null };
  
  // Full format: "Next Week for 1 Month"
  const fullMatch = dateRange.match(/^(Next Week|Two Weeks|Next Month)\s+for\s+(1 Week|1 Month|3 Months)$/i);
  
  if (fullMatch) {
    const timeframe = fullMatch[1];
    const period = fullMatch[2];
    
    // Only update if valid options
    if (timeFrames.includes(timeframe) && durations.includes(period)) {
      return { timeFrame: timeframe, duration: period };
    }
  }
  
  // Only timeframe: "Next Week"
  const timeframeMatch = dateRange.match(/^(Next Week|Two Weeks|Next Month)$/i);
  if (timeframeMatch) {
    const timeframe = timeframeMatch[1];
    if (timeFrames.includes(timeframe)) {
      return { timeFrame: timeframe, duration: null };
    }
  }
  
  // Only duration: "for 1 Month"
  const durationMatch = dateRange.match(/^for\s+(1 Week|1 Month|3 Months)$/i);
  if (durationMatch) {
    const period = durationMatch[1];
    if (durations.includes(period)) {
      return { timeFrame: null, duration: period };
    }
  }
  
  return { timeFrame: null, duration: null };
}

// Format a Date into a readable format like "Mar 15"
export function formatDate(date: Date): string {
  const month = date.toLocaleString('default', { month: 'short' });
  return `${month} ${date.getDate()}`;
} 