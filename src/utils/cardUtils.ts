// src/utils/cardUtils.ts
import type { Card } from '../types';

const typeOrder: { [key: string]: number } = {
  'Creature': 1,
  'Planeswalker': 2,
  'Instant': 3,
  'Sorcery': 4,
  'Enchantment': 5,
  'Artifact': 6,
  'Land': 7,
};


export const groupCardsByType = (cards: Card[]): Record<string, Card[]> => {
  const grouped: Record<string, Card[]> = {};

  cards.forEach(card => {

    let primaryType = 'Other';
    for (const type of Object.keys(typeOrder)) {
      if (card.type_line.includes(type)) {
        primaryType = type;
        break;
      }
    }

    if (!grouped[primaryType]) {
      grouped[primaryType] = [];
    }
    grouped[primaryType].push(card);
  });


  const sortedGrouped = Object.entries(grouped).sort((a, b) => {
    const orderA = typeOrder[a[0]] || 99;
    const orderB = typeOrder[b[0]] || 99;
    return orderA - orderB;
  });

  return Object.fromEntries(sortedGrouped);
};