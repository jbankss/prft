// Tag classifier - categorizes AI-generated tags into colors, moods, styles, or search-only tags

// Color name to hex mapping with variations
const COLOR_MAP: Record<string, { hex: string; label: string }> = {
  // Reds
  'red': { hex: '#ef4444', label: 'Red' },
  'dark red': { hex: '#b91c1c', label: 'Dark Red' },
  'light red': { hex: '#fca5a5', label: 'Light Red' },
  'crimson': { hex: '#dc143c', label: 'Crimson' },
  'maroon': { hex: '#800000', label: 'Maroon' },
  'burgundy': { hex: '#722f37', label: 'Burgundy' },
  
  // Oranges
  'orange': { hex: '#f97316', label: 'Orange' },
  'dark orange': { hex: '#c2410c', label: 'Dark Orange' },
  'light orange': { hex: '#fdba74', label: 'Light Orange' },
  'coral': { hex: '#ff7f50', label: 'Coral' },
  'peach': { hex: '#ffcba4', label: 'Peach' },
  'tangerine': { hex: '#ff9966', label: 'Tangerine' },
  
  // Yellows
  'yellow': { hex: '#eab308', label: 'Yellow' },
  'gold': { hex: '#fbbf24', label: 'Gold' },
  'golden': { hex: '#fbbf24', label: 'Golden' },
  'mustard': { hex: '#d4a017', label: 'Mustard' },
  'lemon': { hex: '#fff44f', label: 'Lemon' },
  
  // Greens
  'green': { hex: '#22c55e', label: 'Green' },
  'dark green': { hex: '#166534', label: 'Dark Green' },
  'light green': { hex: '#86efac', label: 'Light Green' },
  'forest green': { hex: '#228b22', label: 'Forest Green' },
  'olive': { hex: '#808000', label: 'Olive' },
  'mint': { hex: '#98fb98', label: 'Mint' },
  'emerald': { hex: '#50c878', label: 'Emerald' },
  'sage': { hex: '#9dc183', label: 'Sage' },
  'teal': { hex: '#008080', label: 'Teal' },
  'lime': { hex: '#84cc16', label: 'Lime' },
  
  // Blues
  'blue': { hex: '#3b82f6', label: 'Blue' },
  'dark blue': { hex: '#1e40af', label: 'Dark Blue' },
  'light blue': { hex: '#93c5fd', label: 'Light Blue' },
  'navy': { hex: '#000080', label: 'Navy' },
  'royal blue': { hex: '#4169e1', label: 'Royal Blue' },
  'sky blue': { hex: '#87ceeb', label: 'Sky Blue' },
  'cyan': { hex: '#06b6d4', label: 'Cyan' },
  'turquoise': { hex: '#40e0d0', label: 'Turquoise' },
  'aqua': { hex: '#00ffff', label: 'Aqua' },
  'indigo': { hex: '#4f46e5', label: 'Indigo' },
  
  // Purples
  'purple': { hex: '#a855f7', label: 'Purple' },
  'dark purple': { hex: '#6b21a8', label: 'Dark Purple' },
  'light purple': { hex: '#d8b4fe', label: 'Light Purple' },
  'violet': { hex: '#8b5cf6', label: 'Violet' },
  'lavender': { hex: '#e6e6fa', label: 'Lavender' },
  'plum': { hex: '#dda0dd', label: 'Plum' },
  'magenta': { hex: '#d946ef', label: 'Magenta' },
  
  // Pinks
  'pink': { hex: '#ec4899', label: 'Pink' },
  'hot pink': { hex: '#ff69b4', label: 'Hot Pink' },
  'light pink': { hex: '#fbb6ce', label: 'Light Pink' },
  'rose': { hex: '#f43f5e', label: 'Rose' },
  'blush': { hex: '#de5d83', label: 'Blush' },
  'fuchsia': { hex: '#d946ef', label: 'Fuchsia' },
  
  // Browns
  'brown': { hex: '#92400e', label: 'Brown' },
  'dark brown': { hex: '#5c3317', label: 'Dark Brown' },
  'light brown': { hex: '#c8a97e', label: 'Light Brown' },
  'tan': { hex: '#d2b48c', label: 'Tan' },
  'beige': { hex: '#f5f5dc', label: 'Beige' },
  'chocolate': { hex: '#7b3f00', label: 'Chocolate' },
  'coffee': { hex: '#6f4e37', label: 'Coffee' },
  
  // Neutrals
  'black': { hex: '#171717', label: 'Black' },
  'white': { hex: '#fafafa', label: 'White' },
  'gray': { hex: '#6b7280', label: 'Gray' },
  'grey': { hex: '#6b7280', label: 'Grey' },
  'dark gray': { hex: '#374151', label: 'Dark Gray' },
  'light gray': { hex: '#d1d5db', label: 'Light Gray' },
  'silver': { hex: '#c0c0c0', label: 'Silver' },
  'charcoal': { hex: '#36454f', label: 'Charcoal' },
  'cream': { hex: '#fffdd0', label: 'Cream' },
  'ivory': { hex: '#fffff0', label: 'Ivory' },
};

// Mood keywords
const MOOD_KEYWORDS = new Set([
  'professional', 'casual', 'energetic', 'calm', 'dramatic',
  'elegant', 'playful', 'serious', 'warm', 'cool', 'cozy',
  'luxurious', 'rustic', 'modern', 'vintage', 'retro', 'futuristic',
  'romantic', 'edgy', 'sophisticated', 'relaxed', 'intense',
  'serene', 'moody', 'cheerful', 'melancholic', 'mysterious',
  'inspiring', 'peaceful', 'dynamic', 'lively', 'tranquil'
]);

// Style keywords
const STYLE_KEYWORDS = new Set([
  'minimal', 'minimalist', 'bold', 'vibrant', 'muted', 'monochrome',
  'flat', 'textured', 'glossy', 'matte', 'geometric', 'organic',
  'abstract', 'realistic', 'artistic', 'clean', 'grunge', 'neon',
  'pastel', 'saturated', 'desaturated', 'high-contrast', 'low-contrast',
  'film', 'cinematic', 'editorial', 'commercial', 'street', 'portrait',
  'landscape', 'macro', 'documentary'
]);

export interface ClassifiedTags {
  colors: Array<{ id: string; label: string; hex: string }>;
  moods: Array<{ id: string; label: string }>;
  styles: Array<{ id: string; label: string }>;
}

// Normalize tag string for matching
function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/[-_]/g, ' ');
}

// Check if a tag matches a color
function matchColor(tag: string): { id: string; label: string; hex: string } | null {
  const normalized = normalizeTag(tag);
  
  // Direct match
  if (COLOR_MAP[normalized]) {
    const color = COLOR_MAP[normalized];
    return { id: normalized.replace(/\s+/g, '-'), label: color.label, hex: color.hex };
  }
  
  // Check for compound matches (e.g., "dark-green", "forest_green")
  for (const [colorKey, colorData] of Object.entries(COLOR_MAP)) {
    if (normalized === colorKey || normalized.includes(colorKey)) {
      return { id: colorKey.replace(/\s+/g, '-'), label: colorData.label, hex: colorData.hex };
    }
  }
  
  // Check if tag ends with a color word (e.g., "deep blue")
  const words = normalized.split(' ');
  if (words.length >= 1) {
    const lastWord = words[words.length - 1];
    const combined = words.slice(-2).join(' ');
    
    if (COLOR_MAP[combined]) {
      const color = COLOR_MAP[combined];
      return { id: combined.replace(/\s+/g, '-'), label: color.label, hex: color.hex };
    }
    
    if (COLOR_MAP[lastWord]) {
      const color = COLOR_MAP[lastWord];
      return { id: lastWord, label: color.label, hex: color.hex };
    }
  }
  
  return null;
}

// Check if a tag matches a mood
function matchMood(tag: string): { id: string; label: string } | null {
  const normalized = normalizeTag(tag);
  
  if (MOOD_KEYWORDS.has(normalized)) {
    return { id: normalized, label: normalized.charAt(0).toUpperCase() + normalized.slice(1) };
  }
  
  // Check partial matches
  for (const mood of MOOD_KEYWORDS) {
    if (normalized.includes(mood) || mood.includes(normalized)) {
      return { id: mood, label: mood.charAt(0).toUpperCase() + mood.slice(1) };
    }
  }
  
  return null;
}

// Check if a tag matches a style
function matchStyle(tag: string): { id: string; label: string } | null {
  const normalized = normalizeTag(tag);
  
  if (STYLE_KEYWORDS.has(normalized)) {
    return { id: normalized, label: normalized.charAt(0).toUpperCase() + normalized.slice(1) };
  }
  
  // Check partial matches
  for (const style of STYLE_KEYWORDS) {
    if (normalized.includes(style) || style.includes(normalized)) {
      return { id: style, label: style.charAt(0).toUpperCase() + style.slice(1) };
    }
  }
  
  return null;
}

// Main classifier function - takes all tags from all assets and returns classified unique options
export function classifyTags(allTags: string[]): ClassifiedTags {
  const colorsMap = new Map<string, { id: string; label: string; hex: string }>();
  const moodsMap = new Map<string, { id: string; label: string }>();
  const stylesMap = new Map<string, { id: string; label: string }>();
  
  for (const tag of allTags) {
    // Try color first
    const colorMatch = matchColor(tag);
    if (colorMatch && !colorsMap.has(colorMatch.id)) {
      colorsMap.set(colorMatch.id, colorMatch);
      continue;
    }
    
    // Try mood
    const moodMatch = matchMood(tag);
    if (moodMatch && !moodsMap.has(moodMatch.id)) {
      moodsMap.set(moodMatch.id, moodMatch);
      continue;
    }
    
    // Try style
    const styleMatch = matchStyle(tag);
    if (styleMatch && !stylesMap.has(styleMatch.id)) {
      stylesMap.set(styleMatch.id, styleMatch);
    }
    
    // If no match, it's a search-only tag (ignored in filter population)
  }
  
  return {
    colors: Array.from(colorsMap.values()),
    moods: Array.from(moodsMap.values()),
    styles: Array.from(stylesMap.values()),
  };
}

// Get color filter options from tags - returns both static defaults and dynamic from assets
export function getDynamicColorOptions(classifiedTags: ClassifiedTags): Array<{ id: string; label: string; color: string }> {
  // Start with classified colors from assets
  const dynamicColors = classifiedTags.colors.map(c => ({
    id: c.id,
    label: c.label,
    color: c.hex
  }));
  
  return dynamicColors;
}

// Get mood filter options from tags
export function getDynamicMoodOptions(classifiedTags: ClassifiedTags): Array<{ id: string; label: string }> {
  return classifiedTags.moods;
}

// Get style filter options from tags
export function getDynamicStyleOptions(classifiedTags: ClassifiedTags): Array<{ id: string; label: string }> {
  return classifiedTags.styles;
}
