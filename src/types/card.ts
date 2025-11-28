export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // Numeric value for game calculations
  faceUp: boolean;
  id: string;
}

export interface Deck {
  cards: Card[];
}

export type PlayerType = 'human' | 'computer';

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  hand: Card[];
  score: number;
  isActive: boolean;
  connected?: boolean;
}

export type GameType = 'solitaire' | 'blackjack' | 'poker' | 'hearts' | 'asshole';

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export interface GameState {
  id: string;
  type: GameType;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  deck: Deck;
  winner?: string;
  createdAt: Date;
  updatedAt: Date;
}
