import { Card, Deck } from '@/types';
import { createDeck, shuffleDeck, drawCards } from '@/lib/engine';

export interface PokerPlayer {
  id: string;
  name: string;
  type: 'human' | 'computer';
  hand: Card[];
  chips: number;
  currentBet: number;
  totalBet: number;
  hasFolded: boolean;
  hasActed: boolean;
  isAllIn: boolean;
  isDealer: boolean;
}

export interface PokerState {
  deck: Deck;
  players: PokerPlayer[];
  communityCards: Card[];
  pot: number;
  sidePots: { amount: number; playerIds: string[] }[];
  currentBet: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  roundNumber: number;
  winners?: { playerId: string; amount: number; hand: string }[];
}

export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface HandEvaluation {
  rank: HandRank;
  rankValue: number;
  cards: Card[];
  description: string;
}

const HAND_RANK_VALUES: Record<HandRank, number> = {
  'high-card': 1,
  'pair': 2,
  'two-pair': 3,
  'three-of-a-kind': 4,
  'straight': 5,
  'flush': 6,
  'full-house': 7,
  'four-of-a-kind': 8,
  'straight-flush': 9,
  'royal-flush': 10,
};

export const createPokerGame = (
  playerNames: string[],
  playerTypes: ('human' | 'computer')[],
  startingChips = 1000,
  smallBlind = 10,
  bigBlind = 20
): PokerState => {
  const deck = shuffleDeck(createDeck());
  
  const players: PokerPlayer[] = playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    type: playerTypes[index] || 'computer',
    hand: [],
    chips: startingChips,
    currentBet: 0,
    totalBet: 0,
    hasFolded: false,
    hasActed: false,
    isAllIn: false,
    isDealer: index === 0,
  }));
  
  return {
    deck,
    players,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: bigBlind,
    dealerIndex: 0,
    currentPlayerIndex: (players.length > 2 ? 3 : 0) % players.length, // UTG position
    phase: 'preflop',
    smallBlind,
    bigBlind,
    minRaise: bigBlind,
    roundNumber: 1,
  };
};

export const postBlinds = (state: PokerState): PokerState => {
  const newPlayers = [...state.players];
  const smallBlindIndex = (state.dealerIndex + 1) % newPlayers.length;
  const bigBlindIndex = (state.dealerIndex + 2) % newPlayers.length;
  
  // Post small blind
  const sbAmount = Math.min(state.smallBlind, newPlayers[smallBlindIndex].chips);
  newPlayers[smallBlindIndex] = {
    ...newPlayers[smallBlindIndex],
    chips: newPlayers[smallBlindIndex].chips - sbAmount,
    currentBet: sbAmount,
    totalBet: sbAmount,
    isAllIn: newPlayers[smallBlindIndex].chips === sbAmount,
  };
  
  // Post big blind
  const bbAmount = Math.min(state.bigBlind, newPlayers[bigBlindIndex].chips);
  newPlayers[bigBlindIndex] = {
    ...newPlayers[bigBlindIndex],
    chips: newPlayers[bigBlindIndex].chips - bbAmount,
    currentBet: bbAmount,
    totalBet: bbAmount,
    isAllIn: newPlayers[bigBlindIndex].chips === bbAmount,
  };
  
  return {
    ...state,
    players: newPlayers,
    pot: sbAmount + bbAmount,
    currentBet: bbAmount,
  };
};

export const dealHoleCards = (state: PokerState): PokerState => {
  let deck = state.deck;
  const newPlayers = [...state.players];
  
  for (let i = 0; i < newPlayers.length; i++) {
    const { drawnCards, remainingDeck } = drawCards(deck, 2);
    deck = remainingDeck;
    newPlayers[i] = {
      ...newPlayers[i],
      hand: drawnCards.map(c => ({ ...c, faceUp: newPlayers[i].type === 'human' })),
    };
  }
  
  return {
    ...state,
    deck,
    players: newPlayers,
  };
};

export const fold = (state: PokerState, playerId: string): PokerState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hasFolded: true,
    hasActed: true,
  };
  
  return advanceAction({ ...state, players: newPlayers });
};

export const call = (state: PokerState, playerId: string): PokerState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  const player = state.players[playerIndex];
  const callAmount = Math.min(state.currentBet - player.currentBet, player.chips);
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    chips: player.chips - callAmount,
    currentBet: player.currentBet + callAmount,
    totalBet: player.totalBet + callAmount,
    hasActed: true,
    isAllIn: player.chips === callAmount,
  };
  
  return advanceAction({
    ...state,
    players: newPlayers,
    pot: state.pot + callAmount,
  });
};

export const raise = (state: PokerState, playerId: string, raiseAmount: number): PokerState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  const player = state.players[playerIndex];
  const totalBetNeeded = state.currentBet + raiseAmount;
  const amountToAdd = totalBetNeeded - player.currentBet;
  
  if (amountToAdd > player.chips) return null;
  if (raiseAmount < state.minRaise && amountToAdd !== player.chips) return null;
  
  const newPlayers = state.players.map((p, i) => 
    i === playerIndex
      ? {
          ...p,
          chips: p.chips - amountToAdd,
          currentBet: totalBetNeeded,
          totalBet: p.totalBet + amountToAdd,
          hasActed: true,
          isAllIn: p.chips === amountToAdd,
        }
      : { ...p, hasActed: p.hasFolded || p.isAllIn }
  );
  
  return advanceAction({
    ...state,
    players: newPlayers,
    pot: state.pot + amountToAdd,
    currentBet: totalBetNeeded,
    minRaise: raiseAmount,
  });
};

export const check = (state: PokerState, playerId: string): PokerState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  const player = state.players[playerIndex];
  if (player.currentBet !== state.currentBet) return null;
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hasActed: true,
  };
  
  return advanceAction({ ...state, players: newPlayers });
};

export const allIn = (state: PokerState, playerId: string): PokerState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  const player = state.players[playerIndex];
  const allInAmount = player.chips;
  const newBet = player.currentBet + allInAmount;
  
  const isRaise = newBet > state.currentBet;
  
  const newPlayers = state.players.map((p, i) => 
    i === playerIndex
      ? {
          ...p,
          chips: 0,
          currentBet: newBet,
          totalBet: p.totalBet + allInAmount,
          hasActed: true,
          isAllIn: true,
        }
      : isRaise && !p.hasFolded && !p.isAllIn
        ? { ...p, hasActed: false }
        : p
  );
  
  return advanceAction({
    ...state,
    players: newPlayers,
    pot: state.pot + allInAmount,
    currentBet: isRaise ? newBet : state.currentBet,
    minRaise: isRaise ? newBet - state.currentBet : state.minRaise,
  });
};

const advanceAction = (state: PokerState): PokerState => {
  const activePlayers = state.players.filter(p => !p.hasFolded && !p.isAllIn);
  
  // Check if only one player remains (everyone else folded)
  const nonFoldedPlayers = state.players.filter(p => !p.hasFolded);
  if (nonFoldedPlayers.length === 1) {
    return {
      ...state,
      phase: 'showdown',
      winners: [{ 
        playerId: nonFoldedPlayers[0].id, 
        amount: state.pot,
        hand: 'Last player standing'
      }],
    };
  }
  
  // Check if betting round is complete
  const bettingComplete = activePlayers.length === 0 || 
    activePlayers.every(p => p.hasActed && p.currentBet === state.currentBet);
  
  if (bettingComplete) {
    return advancePhase(state);
  }
  
  // Find next player to act
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  while (
    state.players[nextIndex].hasFolded ||
    state.players[nextIndex].isAllIn
  ) {
    nextIndex = (nextIndex + 1) % state.players.length;
    if (nextIndex === state.currentPlayerIndex) break;
  }
  
  return { ...state, currentPlayerIndex: nextIndex };
};

const advancePhase = (state: PokerState): PokerState => {
  const newPlayers = state.players.map(p => ({
    ...p,
    currentBet: 0,
    hasActed: p.hasFolded || p.isAllIn,
  }));
  
  let deck = state.deck;
  let communityCards = [...state.communityCards];
  let phase = state.phase;
  
  // Deal community cards
  switch (state.phase) {
    case 'preflop': {
      const { drawnCards, remainingDeck } = drawCards(deck, 3);
      deck = remainingDeck;
      communityCards = drawnCards.map(c => ({ ...c, faceUp: true }));
      phase = 'flop';
      break;
    }
    case 'flop': {
      const { drawnCards, remainingDeck } = drawCards(deck, 1);
      deck = remainingDeck;
      communityCards = [...communityCards, { ...drawnCards[0], faceUp: true }];
      phase = 'turn';
      break;
    }
    case 'turn': {
      const { drawnCards, remainingDeck } = drawCards(deck, 1);
      deck = remainingDeck;
      communityCards = [...communityCards, { ...drawnCards[0], faceUp: true }];
      phase = 'river';
      break;
    }
    case 'river':
      phase = 'showdown';
      break;
  }
  
  // Find first active player after dealer
  let firstToAct = (state.dealerIndex + 1) % newPlayers.length;
  while (newPlayers[firstToAct].hasFolded || newPlayers[firstToAct].isAllIn) {
    firstToAct = (firstToAct + 1) % newPlayers.length;
  }
  
  const newState = {
    ...state,
    deck,
    communityCards,
    phase: phase as PokerState['phase'],
    players: newPlayers,
    currentBet: 0,
    currentPlayerIndex: firstToAct,
  };
  
  if (phase === 'showdown') {
    return determineWinner(newState);
  }
  
  return newState;
};

export const evaluateHand = (holeCards: Card[], communityCards: Card[]): HandEvaluation => {
  const allCards = [...holeCards, ...communityCards];
  const combinations = getCombinations(allCards, 5);
  
  let best: HandEvaluation | null = null;
  
  for (const combo of combinations) {
    const evaluation = evaluateFiveCards(combo);
    if (!best || compareHands(evaluation, best) > 0) {
      best = evaluation;
    }
  }
  
  return best!;
};

const getCombinations = (cards: Card[], k: number): Card[][] => {
  const result: Card[][] = [];
  
  const combine = (start: number, current: Card[]) => {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i < cards.length; i++) {
      current.push(cards[i]);
      combine(i + 1, current);
      current.pop();
    }
  };
  
  combine(0, []);
  return result;
};

const evaluateFiveCards = (cards: Card[]): HandEvaluation => {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(values);
  // Royal flush is A-K-Q-J-10 (values sorted: [13, 12, 11, 10, 1] with A=1)
  const isRoyal = isStraight && values[0] === 13 && values[4] === 1 && values[1] === 12;
  
  const valueCounts = getValueCounts(values);
  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  
  let rank: HandRank;
  let description: string;
  
  if (isRoyal && isFlush) {
    rank = 'royal-flush';
    description = 'Royal Flush';
  } else if (isStraight && isFlush) {
    rank = 'straight-flush';
    description = 'Straight Flush';
  } else if (counts[0] === 4) {
    rank = 'four-of-a-kind';
    description = 'Four of a Kind';
  } else if (counts[0] === 3 && counts[1] === 2) {
    rank = 'full-house';
    description = 'Full House';
  } else if (isFlush) {
    rank = 'flush';
    description = 'Flush';
  } else if (isStraight) {
    rank = 'straight';
    description = 'Straight';
  } else if (counts[0] === 3) {
    rank = 'three-of-a-kind';
    description = 'Three of a Kind';
  } else if (counts[0] === 2 && counts[1] === 2) {
    rank = 'two-pair';
    description = 'Two Pair';
  } else if (counts[0] === 2) {
    rank = 'pair';
    description = 'Pair';
  } else {
    rank = 'high-card';
    description = 'High Card';
  }
  
  return {
    rank,
    rankValue: HAND_RANK_VALUES[rank],
    cards: sorted,
    description,
  };
};

const checkStraight = (values: number[]): boolean => {
  // Check for Ace-high straight (10-J-Q-K-A where A=1, K=13)
  // When sorted descending by value: [13, 12, 11, 10, 1]
  if (values[0] === 13 && values[1] === 12 && values[2] === 11 && values[3] === 10 && values[4] === 1) {
    return true;
  }
  
  // Check for Ace-low straight (A-2-3-4-5)
  // When sorted descending by value: [5, 4, 3, 2, 1]
  if (values[0] === 5 && values[1] === 4 && values[2] === 3 && values[3] === 2 && values[4] === 1) {
    return true;
  }
  
  // Check regular straight
  for (let i = 0; i < 4; i++) {
    if (values[i] - values[i + 1] !== 1) {
      return false;
    }
  }
  return true;
};

const getValueCounts = (values: number[]): Record<number, number> => {
  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
};

const compareHands = (a: HandEvaluation, b: HandEvaluation): number => {
  if (a.rankValue !== b.rankValue) {
    return a.rankValue - b.rankValue;
  }
  
  // Compare kickers
  for (let i = 0; i < 5; i++) {
    if (a.cards[i].value !== b.cards[i].value) {
      return a.cards[i].value - b.cards[i].value;
    }
  }
  
  return 0;
};

const determineWinner = (state: PokerState): PokerState => {
  const activePlayers = state.players.filter(p => !p.hasFolded);
  
  const evaluations = activePlayers.map(p => ({
    player: p,
    hand: evaluateHand(p.hand, state.communityCards),
  }));
  
  // Sort by hand strength
  evaluations.sort((a, b) => compareHands(b.hand, a.hand));
  
  // Find winners (could be multiple in case of tie)
  const bestHand = evaluations[0].hand;
  const winners = evaluations.filter(e => compareHands(e.hand, bestHand) === 0);
  
  const winAmount = Math.floor(state.pot / winners.length);
  
  return {
    ...state,
    phase: 'finished',
    winners: winners.map(w => ({
      playerId: w.player.id,
      amount: winAmount,
      hand: w.hand.description,
    })),
    players: state.players.map(p => {
      const isWinner = winners.some(w => w.player.id === p.id);
      return {
        ...p,
        chips: p.chips + (isWinner ? winAmount : 0),
        hand: p.hand.map(c => ({ ...c, faceUp: true })),
      };
    }),
  };
};

export const startNewRound = (state: PokerState): PokerState => {
  const deck = shuffleDeck(createDeck());
  const newDealerIndex = (state.dealerIndex + 1) % state.players.length;
  
  const newPlayers = state.players
    .filter(p => p.chips > 0)
    .map((p, i) => ({
      ...p,
      hand: [],
      currentBet: 0,
      totalBet: 0,
      hasFolded: false,
      hasActed: false,
      isAllIn: false,
      isDealer: i === newDealerIndex,
    }));
  
  if (newPlayers.length < 2) {
    return {
      ...state,
      phase: 'finished',
    };
  }
  
  let newState: PokerState = {
    ...state,
    deck,
    players: newPlayers,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    dealerIndex: newDealerIndex,
    currentPlayerIndex: (newDealerIndex + 3) % newPlayers.length,
    phase: 'preflop',
    minRaise: state.bigBlind,
    roundNumber: state.roundNumber + 1,
    winners: undefined,
  };
  
  newState = postBlinds(newState);
  newState = dealHoleCards(newState);
  
  return newState;
};

// AI helper
export const computerAction = (state: PokerState, playerId: string): { action: 'fold' | 'call' | 'raise' | 'check' | 'all-in'; amount?: number } => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { action: 'fold' };
  
  const callAmount = state.currentBet - player.currentBet;
  // potOdds can be used for more sophisticated AI in future
  // const potOdds = callAmount / (state.pot + callAmount);
  
  // Simple AI strategy
  if (callAmount === 0) {
    // Can check
    const raiseChance = Math.random();
    if (raiseChance > 0.7 && player.chips >= state.bigBlind * 2) {
      return { action: 'raise', amount: state.bigBlind * 2 };
    }
    return { action: 'check' };
  }
  
  if (callAmount > player.chips * 0.5) {
    // Big bet relative to stack
    const foldChance = Math.random();
    if (foldChance > 0.6) {
      return { action: 'fold' };
    }
    return { action: 'call' };
  }
  
  if (callAmount <= state.bigBlind * 2) {
    return { action: 'call' };
  }
  
  const callChance = Math.random();
  if (callChance > 0.4) {
    return { action: 'call' };
  }
  
  return { action: 'fold' };
};
