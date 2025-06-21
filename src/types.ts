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
  meld_result_card?: Card;
  is_custom?: boolean;
  // --- MODIFIED --- Added instance-specific state fields for in-game tracking.
  instanceId?: string;
  isTapped?: boolean;
  isFlipped?: boolean;
  mana_cost?: string;
  oracle_text?: string;
}

// Configuration for a single player in the game setup screen.
export interface PlayerConfig {
    id: string;
    name: string;
    deckFile: FileSystemFileHandle | null;
    color: string;
}

// Settings for the entire game session.
export interface GameSettings {
    players: PlayerConfig[];
    layout: '1vAll' | 'split';
}

// PlayerState now includes more zones and links to the initial config.
export interface PlayerState {
  id: string;
  name: string;
  color: string;
  life: number;
  hand: Card[];
  library: Card[];
  graveyard: Card[];
  exile: Card[];
  commandZone: Card[];
  battlefield: Card[][]; // Array of 4 arrays, one for each row
}


export interface CardIdentifier {
  name?: string;
  set?: string;
  collector_number?: string;
}

// --- NEW --- Represents the entire savable state of a game.
export interface GameState {
    playerStates: PlayerState[];
    activeOpponentId: string | null;
    gameSettings: GameSettings;
}