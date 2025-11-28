import { Card, Deck } from '@/types';
import { createDeck, shuffleDeck, drawCards } from '@/lib/engine';

export interface BlackjackPlayer {
  id: string;
  name: string;
  hand: Card[];
  bet: number;
  chips: number;
  hasStood: boolean;
  hasBusted: boolean;
  hasBlackjack: boolean;
  isDealer: boolean;
}

export interface BlackjackState {
  deck: Deck;
  players: BlackjackPlayer[];
  dealer: BlackjackPlayer;
  currentPlayerIndex: number;
  phase: 'betting' | 'dealing' | 'playing' | 'dealer' | 'settlement' | 'finished';
  roundNumber: number;
}

export const getHandValue = (hand: Card[]): { value: number; isSoft: boolean } => {
  let value = 0;
  let aces = 0;
  
  for (const card of hand) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank, 10);
    }
  }
  
  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  
  return { value, isSoft: aces > 0 && value <= 21 };
};

export const isBlackjack = (hand: Card[]): boolean => {
  return hand.length === 2 && getHandValue(hand).value === 21;
};

export const isBusted = (hand: Card[]): boolean => {
  return getHandValue(hand).value > 21;
};

export const createBlackjackGame = (playerNames: string[], startingChips = 1000): BlackjackState => {
  const deck = shuffleDeck(createDeck());
  
  const players: BlackjackPlayer[] = playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    hand: [],
    bet: 0,
    chips: startingChips,
    hasStood: false,
    hasBusted: false,
    hasBlackjack: false,
    isDealer: false,
  }));
  
  const dealer: BlackjackPlayer = {
    id: 'dealer',
    name: 'Dealer',
    hand: [],
    bet: 0,
    chips: Infinity,
    hasStood: false,
    hasBusted: false,
    hasBlackjack: false,
    isDealer: true,
  };
  
  return {
    deck,
    players,
    dealer,
    currentPlayerIndex: 0,
    phase: 'betting',
    roundNumber: 1,
  };
};

export const placeBet = (state: BlackjackState, playerId: string, amount: number): BlackjackState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  const player = state.players[playerIndex];
  if (amount > player.chips || amount < 1) return null;
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = { ...player, bet: amount };
  
  return { ...state, players: newPlayers };
};

export const dealInitialCards = (state: BlackjackState): BlackjackState => {
  let currentDeck = state.deck;
  const newPlayers = [...state.players];
  let newDealer = { ...state.dealer };
  
  // Deal 2 cards to each player
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < newPlayers.length; i++) {
      const { drawnCards, remainingDeck } = drawCards(currentDeck, 1);
      currentDeck = remainingDeck;
      newPlayers[i] = {
        ...newPlayers[i],
        hand: [...newPlayers[i].hand, { ...drawnCards[0], faceUp: true }],
      };
    }
    
    // Deal to dealer (second card face down)
    const { drawnCards, remainingDeck } = drawCards(currentDeck, 1);
    currentDeck = remainingDeck;
    newDealer = {
      ...newDealer,
      hand: [...newDealer.hand, { ...drawnCards[0], faceUp: round === 0 }],
    };
  }
  
  // Check for blackjacks
  for (let i = 0; i < newPlayers.length; i++) {
    if (isBlackjack(newPlayers[i].hand)) {
      newPlayers[i] = { ...newPlayers[i], hasBlackjack: true, hasStood: true };
    }
  }
  
  if (isBlackjack(newDealer.hand)) {
    newDealer = { ...newDealer, hasBlackjack: true };
  }
  
  return {
    ...state,
    deck: currentDeck,
    players: newPlayers,
    dealer: newDealer,
    phase: 'playing',
    currentPlayerIndex: 0,
  };
};

export const hit = (state: BlackjackState, playerId: string): BlackjackState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  if (state.players[playerIndex].hasStood || state.players[playerIndex].hasBusted) {
    return null;
  }
  
  const { drawnCards, remainingDeck } = drawCards(state.deck, 1);
  const newPlayers = [...state.players];
  const newHand = [...newPlayers[playerIndex].hand, { ...drawnCards[0], faceUp: true }];
  
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand: newHand,
    hasBusted: isBusted(newHand),
  };
  
  if (newPlayers[playerIndex].hasBusted) {
    newPlayers[playerIndex].hasStood = true;
  }
  
  let nextPlayerIndex = state.currentPlayerIndex;
  let phase = state.phase;
  
  // Move to next player if current player busted
  if (newPlayers[playerIndex].hasBusted) {
    const next = findNextActivePlayer(newPlayers, state.currentPlayerIndex);
    if (next === -1) {
      phase = 'dealer';
    } else {
      nextPlayerIndex = next;
    }
  }
  
  return {
    ...state,
    deck: remainingDeck,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex,
    phase,
  };
};

export const stand = (state: BlackjackState, playerId: string): BlackjackState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = { ...newPlayers[playerIndex], hasStood: true };
  
  const nextPlayerIndex = findNextActivePlayer(newPlayers, state.currentPlayerIndex);
  
  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex === -1 ? state.currentPlayerIndex : nextPlayerIndex,
    phase: nextPlayerIndex === -1 ? 'dealer' : state.phase,
  };
};

const findNextActivePlayer = (players: BlackjackPlayer[], currentIndex: number): number => {
  for (let i = currentIndex + 1; i < players.length; i++) {
    if (!players[i].hasStood && !players[i].hasBusted) {
      return i;
    }
  }
  return -1;
};

export const dealerPlay = (state: BlackjackState): BlackjackState => {
  const currentState = { ...state };
  const dealer = { ...currentState.dealer };
  let deck = currentState.deck;
  
  // Flip hole card
  dealer.hand = dealer.hand.map(card => ({ ...card, faceUp: true }));
  
  // Dealer must hit on soft 17 or below
  while (getHandValue(dealer.hand).value < 17) {
    const { drawnCards, remainingDeck } = drawCards(deck, 1);
    deck = remainingDeck;
    dealer.hand = [...dealer.hand, { ...drawnCards[0], faceUp: true }];
  }
  
  dealer.hasBusted = isBusted(dealer.hand);
  dealer.hasStood = true;
  
  return {
    ...currentState,
    deck,
    dealer,
    phase: 'settlement',
  };
};

export const settleRound = (state: BlackjackState): BlackjackState => {
  const dealerValue = getHandValue(state.dealer.hand).value;
  const dealerBusted = state.dealer.hasBusted;
  
  const newPlayers = state.players.map(player => {
    const playerValue = getHandValue(player.hand).value;
    let chipChange = 0;
    
    if (player.hasBusted) {
      chipChange = -player.bet;
    } else if (player.hasBlackjack && !state.dealer.hasBlackjack) {
      chipChange = player.bet * 1.5; // Blackjack pays 3:2
    } else if (state.dealer.hasBlackjack && !player.hasBlackjack) {
      chipChange = -player.bet;
    } else if (dealerBusted) {
      chipChange = player.bet;
    } else if (playerValue > dealerValue) {
      chipChange = player.bet;
    } else if (playerValue < dealerValue) {
      chipChange = -player.bet;
    }
    // Push (tie) - no change
    
    return {
      ...player,
      chips: player.chips + chipChange,
    };
  });
  
  return {
    ...state,
    players: newPlayers,
    phase: 'finished',
  };
};

export const startNewRound = (state: BlackjackState): BlackjackState => {
  // Shuffle if deck is low
  let deck = state.deck;
  if (deck.cards.length < 15) {
    deck = shuffleDeck(createDeck());
  }
  
  const newPlayers = state.players.map(player => ({
    ...player,
    hand: [],
    bet: 0,
    hasStood: false,
    hasBusted: false,
    hasBlackjack: false,
  }));
  
  const newDealer: BlackjackPlayer = {
    ...state.dealer,
    hand: [],
    hasStood: false,
    hasBusted: false,
    hasBlackjack: false,
  };
  
  return {
    ...state,
    deck,
    players: newPlayers,
    dealer: newDealer,
    currentPlayerIndex: 0,
    phase: 'betting',
    roundNumber: state.roundNumber + 1,
  };
};
