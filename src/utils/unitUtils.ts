
/**
 * Utility to handle unit of measurement logic for specific artists.
 */

const TARGET_ARTISTS = ['Marge Organo', 'Ramon Orlina'];

/**
 * Checks if the artist is one of those who should use 'cm' as their unit of measurement.
 * Handles both "First Last" and "Last, First" formats.
 */
export const isCmArtist = (artistName: string): boolean => {
  if (!artistName) return false;
  
  const normalizedInput = artistName.trim().toLowerCase();
  
  return TARGET_ARTISTS.some(target => {
    const normalizedTarget = target.toLowerCase();
    const [first, last] = normalizedTarget.split(' ');
    
    // Check "First Last" format
    if (normalizedInput === normalizedTarget) return true;
    
    // Check "Last, First" format
    if (normalizedInput === `${last}, ${first}`) return true;
    
    // Check "Last First" format (no comma)
    if (normalizedInput === `${last} ${first}`) return true;
    
    return false;
  });
};

/**
 * Formats the dimensions string, ensuring the correct unit (cm or inches) is used.
 * If the artist is a 'cm artist', replaces 'inches', 'in', or '"' with 'cm'.
 * If no unit is present, adds the appropriate one.
 */
export const formatDimensions = (dimensions: string, artistName: string): string => {
  if (!dimensions) return dimensions;
  
  const isCm = isCmArtist(artistName);
  const dimLower = dimensions.toLowerCase();
  
  if (isCm) {
    // If it's a cm artist, ensure we use 'cm'
    if (dimLower.includes('inch') || dimLower.includes(' in') || dimLower.includes('"')) {
      return dimensions
        .replace(/inches/gi, 'cm')
        .replace(/inch/gi, 'cm')
        .replace(/ in/gi, ' cm')
        .replace(/"/g, ' cm');
    }
    
    // If no unit is present, add ' cm'
    if (!dimLower.includes('cm')) {
      return `${dimensions.trim()} cm`;
    }
  } else {
    // For other artists, ensure we use 'Inches' (standardizing current behavior)
    if (!dimLower.includes('inch') && !dimLower.includes('"') && !dimLower.includes('cm')) {
      return `${dimensions.trim()} Inches`;
    }
  }
  
  return dimensions;
};


