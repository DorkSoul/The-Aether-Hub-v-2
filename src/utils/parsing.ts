import type { CardIdentifier } from '../types';

/**
 * Parses a decklist string into an array of card identifiers.
 * This version uses a more robust two-pass regex approach to handle different formats.
 */
export function parseDecklist(decklist: string): CardIdentifier[] {
  const identifiers: CardIdentifier[] = [];
  const lines = decklist.split(/\r?\n/).filter(line => line.trim() !== '');

  // Regex for lines that include set and collector number, e.g., "1 Card Name (SET) 123"
  const withSetRegex = /^(?:(\d+)\s*x?\s+)?(.+?)\s\((\w{3,5})\)\s+([\w\d-]+).*/;
  
  // A simpler regex for lines with only a card name.
  const withoutSetRegex = /^(?:(\d+)\s*x?\s+)?(.+)/;

  lines.forEach(line => {
    const trimmedLine = line.trim();
    let match = trimmedLine.match(withSetRegex);
    let name: string | undefined;
    let quantityStr: string | undefined;
    let set: string | undefined;
    let collectorNumber: string | undefined;

    if (match) {
      // Line matches the format with set/number
      quantityStr = match[1];
      name = match[2].trim();
      set = match[3];
      collectorNumber = match[4];
    } else {
      // If not, try the format with only a name
      match = trimmedLine.match(withoutSetRegex);
      if (match) {
        quantityStr = match[1];
        name = match[2].trim();
      }
    }

    // Ensure a valid name was extracted before proceeding
    if (name) {
      const quantity = parseInt(quantityStr || '1', 10);

      // For multi-faced cards, use only the front face name for the API search
      if (name.includes('//')) {
        name = name.split('//')[0].trim();
      }
      
      const identifier: CardIdentifier = { name };
      if (set && collectorNumber) {
        identifier.set = set.toLowerCase();
        identifier.collector_number = collectorNumber;
      }

      for (let i = 0; i < quantity; i++) {
        identifiers.push({ ...identifier });
      }

    } else {
      console.warn(`Could not extract a valid card name from line: "${trimmedLine}"`);
    }
  });

  return identifiers;
}