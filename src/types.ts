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
  power?: string;
  toughness?: string;
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
  instanceId?: string;
  isTapped?: boolean;
  isFlipped?: boolean;
  mana_cost?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  counters?: { [type: string]: number };
  customCounters?: { [type: string]: number };
  x?: number;
  y?: number;
  onRemoveAllCounters?: (cardInstanceId: string, counterType: string) => void;
  onCounterSelect?: (counterType: string) => void;
}

export interface StackItem {
  id: string; 
  text: string; 
  cardInstanceId: string; 
  sourceCardName: string; 
}

export interface PlayerConfig {
    id: string;
    name: string;
    deckFile: FileSystemFileHandle | null;
    color: string;
    username: string;
}

export interface GameSettings {
    players: PlayerConfig[];
    layout: 'tabs' | 'split';
    playAreaLayout: 'rows' | 'freeform';
}

export type ManaType = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';

export type ManaPool = {
  [key in ManaType]: number;
};

export interface PlayerState {
  id: string;
  name: string;
  username: string;
  color: string;
  life: number;
  mana: ManaPool; 
  hand: Card[];
  library: Card[];
  graveyard: Card[];
  exile: Card[];
  commandZone: Card[];
  battlefield: Card[][];
  counters?: { [type: string]: number };
}


export interface CardIdentifier {
  name?: string;
  set?: string;
  collector_number?: string;
}

export interface CardLocation {
    playerId: string;
    zone: 'hand' | 'library' | 'graveyard' | 'exile' | 'commandZone' | 'battlefield';
    row?: number; 
}

export interface DraggedCard {
    type: 'card';
    card: Card;
    source: CardLocation;
    offset: { x: number; y: number; }; 
}

export interface DraggedLibraryCard {
    type: 'library';
    source: CardLocation;
    offset: { x: number; y: number; }; 
}

export type DraggedItem = DraggedCard | DraggedLibraryCard;

export interface GameState {
    playerStates: PlayerState[];
    activeOpponentId: string | null;
    gameSettings: GameSettings;
    handHeights?: { [playerId: string]: number };
    freeformCardSizes?: { [playerId: string]: number };
    isTopRotated?: boolean;
}

export interface PeerInfo {
    id: string;
    username: string;
}