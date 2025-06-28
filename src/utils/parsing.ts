// src/utils/parsing.ts
import type { CardIdentifier } from '../types';

/**
 * Parses a decklist string into an array of card identifiers.
 * This version uses a more robust two-pass regex approach to handle different formats.
 */
export function parseDecklist(decklist: string): CardIdentifier[] {
  const identifiers: CardIdentifier[] = [];
  const lines = decklist.split(/\r?\n/).filter(line => line.trim() !== '');

  const withSetRegex = /^(?:(\d+)\s*x?\s+)?(.+?)\s\((\w{3,5})\)\s+([\w\d-]+).*/;
  
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

      quantityStr = match[1];
      set = match[3];
      collectorNumber = match[4];


      identifier = {
        set: set.toLowerCase(),
        collector_number: collectorNumber,
      };

    } else {
      match = trimmedLine.match(withoutSetRegex);
      if (match) {
        quantityStr = match[1];
        name = match[2].trim();

        if (name.includes('//')) {
          name = name.split('//')[0].trim();
        }
        identifier = { name };
      } else {
        console.warn(`Could not extract a valid card identifier from line: "${trimmedLine}"`);
        return; 
      }
    }

    const quantity = parseInt(quantityStr || '1', 10);
    for (let i = 0; i < quantity; i++) {
      identifiers.push({ ...identifier });
    }
  });

  return identifiers;
}