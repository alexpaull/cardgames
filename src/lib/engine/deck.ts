import { Card, Deck, Suit, Rank } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getRankValue = (rank: Rank): number => {
  const values: Record<Rank, number> = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
  };
  return values[rank];
};

export const createCard = (suit: Suit, rank: Rank, faceUp = false): Card => ({
  suit,
  rank,
  value: getRankValue(rank),
  faceUp,
  id: uuidv4(),
});

export const createDeck = (shuffled = false): Deck => {
  const cards: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(createCard(suit, rank));
    }
  }
  
  const deck: Deck = { cards };
  
  if (shuffled) {
    return shuffleDeck(deck);
  }
  
  return deck;
};

export const shuffleDeck = (deck: Deck): Deck => {
  const cards = [...deck.cards];
  
  // Fisher-Yates shuffle algorithm
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  
  return { cards };
};

export const drawCards = (deck: Deck, count: number): { drawnCards: Card[]; remainingDeck: Deck } => {
  const drawnCards = deck.cards.slice(0, count);
  const remainingDeck: Deck = { cards: deck.cards.slice(count) };
  
  return { drawnCards, remainingDeck };
};

export const flipCard = (card: Card): Card => ({
  ...card,
  faceUp: !card.faceUp,
});

export const flipAllCards = (cards: Card[], faceUp: boolean): Card[] =>
  cards.map(card => ({ ...card, faceUp }));

export const getCardDisplay = (card: Card): string => {
  if (!card.faceUp) return '🂠';
  
  const suitSymbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  
  return `${card.rank}${suitSymbols[card.suit]}`;
};

export const isRed = (card: Card): boolean => 
  card.suit === 'hearts' || card.suit === 'diamonds';

export const compareCards = (a: Card, b: Card): number => {
  return a.value - b.value;
};

export const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => {
    // Sort by suit first, then by rank
    const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    if (suitOrder !== 0) return suitOrder;
    return a.value - b.value;
  });
};
