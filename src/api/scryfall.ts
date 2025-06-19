// src/api/scryfall.ts
import type { Card } from '../types';

const API_BASE_URL = 'https://api.scryfall.com';

export async function getCardByName(name: string): Promise<Card> {
  // Scryfall's fuzzy search is good for finding cards by name
  const response = await fetch(`<span class="math-inline">\{API\_BASE\_URL\}/cards/named?fuzzy\=</span>{encodeURIComponent(name)}`);

  if (!response.ok) {
    throw new Error(`Could not find card: ${name}`);
  }

  const data: Card = await response.json();
  return data;
}

export async function getCardsFromNames(cardNames: string[]): Promise<Card[]> {
  if (cardNames.length === 0) {
    return [];
  }

  // Scryfall's collection endpoint expects a list of identifiers
  const identifiers = cardNames.map(name => ({ name }));

  const response = await fetch(`${API_BASE_URL}/cards/collection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifiers }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch card collection from Scryfall.');
  }

  const data = await response.json();
  // Filter for cards that were successfully found
  return data.data.filter((card: any) => !card.not_found);
}