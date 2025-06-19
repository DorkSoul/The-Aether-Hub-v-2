// src/api/scryfall.ts
import type { Card, CardIdentifier } from '../types';

const API_BASE_URL = 'https://api.scryfall.com';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchCardCollection(identifiers: CardIdentifier[]): Promise<{ data: Card[], not_found: CardIdentifier[] }> {
    const response = await fetch(`${API_BASE_URL}/cards/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Scryfall API error:', errorData);
        throw new Error(`Failed to fetch from Scryfall. Status: ${response.status}`);
    }
    return response.json();
}

export async function getCardsFromNames(namesOrIdentifiers: (string | CardIdentifier)[]): Promise<Card[]> {
  if (namesOrIdentifiers.length === 0) {
    return [];
  }

  // Normalize input to CardIdentifier objects
  const identifiers: CardIdentifier[] = namesOrIdentifiers.map(item =>
    typeof item === 'string' ? { name: item } : item
  );
  
  // Scryfall's collection endpoint takes up to 75 identifiers.
  const chunks: CardIdentifier[][] = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    chunks.push(identifiers.slice(i, i + 75));
  }

  const allCards: Card[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const result = await fetchCardCollection(chunk);
    
    if (result.data) {
        allCards.push(...result.data);
    }
    
    if (result.not_found && result.not_found.length > 0) {
        console.warn("Cards not found:", result.not_found);
    }

    // Add delay, but not after the last chunk
    if (i < chunks.length - 1) {
      await delay(1000);
    }
  }

  return allCards;
}