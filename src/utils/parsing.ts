// src/utils/parsing.ts

/**
 * Parses a decklist string into an array of card names.
 * Supports formats like:
 * "4 Lightning Bolt"
 * "4x Lightning Bolt"
 * "Lightning Bolt"
 */
export function parseDecklist(decklist: string): string[] {
  const cardNames: string[] = [];
  const lines = decklist.split(/\r?\n/).filter(line => line.trim() !== '');

  lines.forEach(line => {
    // Regex to capture quantity (e.g., "4", "4x") and the card name
    const match = line.trim().match(/^(?:(\d+)\s*x?\s+)?(.+)/);
    if (match) {
      const quantity = parseInt(match[1] || '1', 10);
      const name = match[2].trim();
      for (let i = 0; i < quantity; i++) {
        cardNames.push(name);
      }
    }
  });

  return cardNames;
}