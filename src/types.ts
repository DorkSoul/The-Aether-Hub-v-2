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
  // --- NEW --- Coordinates for freeform layout
  x?: number;
  y?: number;
}

export interface StackItem {
  id: string; // Unique ID for the stack item itself
  text: string; // The ability/spell text
  cardInstanceId: string; // The instanceId of the card that generated this item
  sourceCardName: string; // The name of the source card for display
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
    playAreaLayout: 'rows' | 'freeform';
}

// --- NEW --- Define Mana Types and Pool
export type ManaType = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';

export type ManaPool = {
  [key in ManaType]: number;
};

// PlayerState now includes more zones and links to the initial config.
export interface PlayerState {
  id: string;
  name: string;
  color: string;
  life: number;
  mana: ManaPool; // --- NEW ---
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

// --- NEW --- Location of a card within the game state.
export interface CardLocation {
    playerId: string;
    zone: 'hand' | 'library' | 'graveyard' | 'exile' | 'commandZone' | 'battlefield';
    row?: number; // for battlefield
}

// --- NEW --- Represents a single card being moved in a drag-and-drop operation.
export interface DraggedCard {
    type: 'card';
    card: Card;
    source: CardLocation;
    offset: { x: number; y: number; }; // Cursor offset within the card
}

// --- NEW --- Represents the top card of a library being moved, without revealing its identity.
export interface DraggedLibraryCard {
    type: 'library';
    source: CardLocation;
    offset: { x: number; y: number; }; // Cursor offset
}

// --- NEW --- A union type for any item that can be dragged on the game board.
export type DraggedItem = DraggedCard | DraggedLibraryCard;


// --- NEW --- Represents the entire savable state of a game.
export interface GameState {
    playerStates: PlayerState[];
    activeOpponentId: string | null;
    gameSettings: GameSettings;
    handHeights?: { [playerId: string]: number };
    freeformCardSizes?: { [playerId: string]: number };
}