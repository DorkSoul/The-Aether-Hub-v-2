// src/types.ts
export interface Card {
  collector_number: any;
  set: any;
  type_line: any;
  id: string;
  name: string;
  image_uris: {
    small: string;
    normal: string;
    large: string;
    png: string;
  };
  // Add other card properties you might need here
  // e.g., mana_cost, type_line, oracle_text
}

export interface PlayerState {
  life: number;
  hand: Card[];
  library: Card[];
  graveyard: Card[];
  battlefield: Card[];
}