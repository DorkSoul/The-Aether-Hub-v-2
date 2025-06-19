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

export interface RelatedCard {
  id: string;
  object: 'related_card';
  component: 'token' | 'meld_part' | 'meld_result' | 'combo_piece';
  name: string;
  type_line: string;
  uri: string;
}

export interface Card {
  collector_number: string;
  set: string;
  type_line: string;
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
  all_parts?: RelatedCard[];
  meld_result_card?: Card; // To store the fetched meld result
}

export interface PlayerState {
  life: number;
  hand: Card[];
  library: Card[];
  graveyard: Card[];
  battlefield: Card[];
}

export interface CardIdentifier {
  name?: string; // Name is optional if set/collector_number are provided
  set?: string;
  collector_number?: string;
}