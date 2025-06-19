// src/utils/parsing.ts
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
    let identifier: CardIdentifier;

    if (match) {
      // Line matches the format with set and collector number.
      quantityStr = match[1];
      set = match[3];
      collectorNumber = match[4];

      // Per Scryfall API docs, set & collector_number is a unique lookup.
      // Providing name is optional and can cause conflicts. For the most
      // reliable lookup, we create an identifier with ONLY set and collector_number.
      identifier = {
        set: set.toLowerCase(),
        collector_number: collectorNumber,
      };

    } else {
      // If not, try the format with only a name.
      match = trimmedLine.match(withoutSetRegex);
      if (match) {
        quantityStr = match[1];
        name = match[2].trim();

        // For name-only searches of multi-face cards, it's safest to use the front face name.
        if (name.includes('//')) {
          name = name.split('//')[0].trim();
        }
        identifier = { name };
      } else {
        console.warn(`Could not extract a valid card identifier from line: "${trimmedLine}"`);
        return; // continue to next line in forEach
      }
    }

    const quantity = parseInt(quantityStr || '1', 10);
    for (let i = 0; i < quantity; i++) {
      identifiers.push({ ...identifier });
    }
  });

  return identifiers;
}