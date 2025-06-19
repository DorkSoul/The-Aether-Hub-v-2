// src/types.ts
export interface CardFace {
  name: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
  };
  type_line: string;
  mana_cost?: string;
  oracle_text?: string;
}

export interface Card {
  collector_number: any;
  set: any;
  type_line: any;
  id: string;
  name: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
  };
  layout?: string;
  card_faces?: CardFace[];
}

export interface PlayerState {
  life: number;
  hand: Card[];
  library: Card[];
  graveyard: Card[];
  battlefield: Card[];
}

export interface CardIdentifier {
  name: string;
  set?: string;
  collector_number?: string;
}