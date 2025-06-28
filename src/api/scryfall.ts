// src/api/scryfall.ts
import type { Card, CardIdentifier } from '../types';

const API_BASE_URL = 'https://api.scryfall.com';

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getCardByUri(uri: string): Promise<Card> {
    const response = await fetch(uri);
    if (!response.ok) {
        const errorData = await response.json();
        console.error('Scryfall API error:', errorData);
        throw new Error(`Failed to fetch from Scryfall URI ${uri}. Status: ${response.status}`);
    }
    return response.json();
}

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

/**
 * Fetches a single card from a Scryfall URL.
 * It parses the set and collector number from the URL to get the exact card.
 */
export async function getCardByUrl(url: string): Promise<Card | null> {
    const match = url.match(/scryfall\.com\/card\/([a-z0-9]+)\/([\w\d-]+)/);

    if (match && match[1] && match[2]) {
        const set = match[1];
        const collector_number = match[2];
        const result = await fetchCardCollection([{ set, collector_number }]);
        if (result.data && result.data.length > 0) {
            const card = result.data[0];
            // If the card is a meld card, fetch its result part separately
            if (card.layout === 'meld' && card.all_parts) {
                const meldPart = card.all_parts.find(p => p.component === 'meld_result');
                if (meldPart && meldPart.uri) {
                    try {
                        const meldResultCard = await getCardByUri(meldPart.uri);
                        card.meld_result_card = meldResultCard;
                    } catch(err) {
                        console.error("Failed to fetch meld result card:", err)
                    }
                }
            }
            return card;
        }
    }
    console.error("Could not parse a valid set and collector number from the URL:", url);
    return null;
}


export async function getCardsFromNames(namesOrIdentifiers: (string | CardIdentifier)[]): Promise<Card[]> {
  if (namesOrIdentifiers.length === 0) {
    return [];
  }

  const identifiers: CardIdentifier[] = namesOrIdentifiers.map(item =>
    typeof item === 'string' ? { name: item } : item
  );
  
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

    if (i < chunks.length - 1) {
      // Delay to 1 second between batch requests for card data.
      await delay(1000);
    }
  }

  return allCards;
}