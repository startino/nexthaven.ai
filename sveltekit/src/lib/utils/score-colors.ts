/**
 * Get the appropriate Tailwind color classes for a score gradient
 * @param score - Score value between 0 and 100
 * @param format - Format of the color classes ('border', 'bg', or 'gradient')
 * @param textColor - Whether to include text color class (only for gradient format)
 * @returns Tailwind color classes as a string
 */
export function getScoreColor(score: number, format: 'border' | 'bg' | 'gradient' = 'gradient', textColor: boolean = true): string {
  // Define color mappings
  const colors = {
    90: { border: 'border-green-500', bg: 'bg-green-500', gradient: 'from-green-500 to-green-400', text: 'text-white' },
    80: { border: 'border-lime-500', bg: 'bg-lime-500', gradient: 'from-lime-500 to-lime-400', text: 'text-white' },
    70: { border: 'border-yellow-400', bg: 'bg-yellow-400', gradient: 'from-yellow-400 to-yellow-300', text: 'text-black' },
    60: { border: 'border-yellow-300', bg: 'bg-yellow-300', gradient: 'from-yellow-300 to-yellow-200', text: 'text-black' },
    50: { border: 'border-amber-500', bg: 'bg-amber-500', gradient: 'from-amber-500 to-amber-400', text: 'text-white' },
    40: { border: 'border-orange-500', bg: 'bg-orange-500', gradient: 'from-orange-500 to-orange-400', text: 'text-white' },
    0: { border: 'border-red-500', bg: 'bg-red-500', gradient: 'from-red-500 to-red-400', text: 'text-white' }
  };

  // Find the appropriate color threshold
  const threshold = Object.keys(colors)
    .map(Number)
    .sort((a, b) => b - a)
    .find(t => score >= t) ?? 0;

  // Get the color object for the threshold
  const color = colors[threshold as keyof typeof colors];

  // Return the appropriate format
  if (format === 'gradient') {
    return `bg-gradient-to-r ${color.gradient}${textColor ? ` ${color.text}` : ''}`;
  }
  return color[format];
}

/**
 * Get SVG stop colors for score gradients
 * @param score - Score value between 0 and 100
 * @returns Array of CSS class names for stop colors
 */
export function getScoreStopColors(score: number): [string, string] {
  if (score >= 90) return ['stop-color-green-500', 'stop-color-green-400'];
  if (score >= 80) return ['stop-color-lime-500', 'stop-color-lime-400'];
  if (score >= 70) return ['stop-color-yellow-400', 'stop-color-yellow-300'];
  if (score >= 60) return ['stop-color-yellow-300', 'stop-color-yellow-200'];
  if (score >= 50) return ['stop-color-amber-500', 'stop-color-amber-400'];
  if (score >= 40) return ['stop-color-orange-500', 'stop-color-orange-400'];
  return ['stop-color-red-500', 'stop-color-red-400'];
}

/**
 * Get the label for a score range
 * @param score - Score value between 0 and 100
 * @returns Label string
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent Match';
  if (score >= 80) return 'Great Match';
  if (score >= 70) return 'Good Match';
  if (score >= 60) return 'Fair Match';
  if (score >= 50) return 'Average Match';
  if (score >= 40) return 'Below Average Match';
  return 'Poor Match';
}

/**
 * Get background and text color classes for score badges
 * @param score - Score value between 0 and 100
 * @param isDark - Whether to use dark mode colors
 * @returns Object with background and text color classes
 */
export function getScoreBadgeColors(score: number, isDark: boolean = false): { bg: string, text: string } {
  if (score >= 90) return {
    bg: isDark ? 'bg-green-900/30' : 'bg-green-100',
    text: isDark ? 'text-green-400' : 'text-green-800'
  };
  if (score >= 80) return {
    bg: isDark ? 'bg-lime-900/30' : 'bg-lime-100',
    text: isDark ? 'text-lime-400' : 'text-lime-800'
  };
  if (score >= 70) return {
    bg: isDark ? 'bg-yellow-900/30' : 'bg-yellow-100',
    text: isDark ? 'text-yellow-400' : 'text-yellow-800'
  };
  if (score >= 60) return {
    bg: isDark ? 'bg-yellow-900/30' : 'bg-yellow-100',
    text: isDark ? 'text-yellow-400' : 'text-yellow-800'
  };
  if (score >= 50) return {
    bg: isDark ? 'bg-amber-900/30' : 'bg-amber-100',
    text: isDark ? 'text-amber-400' : 'text-amber-800'
  };
  if (score >= 40) return {
    bg: isDark ? 'bg-orange-900/30' : 'bg-orange-100',
    text: isDark ? 'text-orange-400' : 'text-orange-800'
  };
  return {
    bg: isDark ? 'bg-red-900/30' : 'bg-red-100',
    text: isDark ? 'text-red-400' : 'text-red-800'
  };
} 