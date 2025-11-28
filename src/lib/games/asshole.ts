import { Card } from '@/types';
import { createDeck, shuffleDeck, sortCards } from '@/lib/engine';

export interface AssholePlayer {
  id: string;
  name: string;
  type: 'human' | 'computer';
  hand: Card[];
  rank: 'president' | 'vice-president' | 'neutral' | 'vice-asshole' | 'asshole' | null;
  finishOrder: number | null;
  hasPassed: boolean;
}

export interface AssholeState {
  players: AssholePlayer[];
  currentPlayerIndex: number;
  pile: Card[][];
  lastPlayedBy: string | null;
  currentRank: number | null;
  currentCount: number;
  consecutivePasses: number;
  phase: 'trading' | 'playing' | 'roundEnd' | 'gameEnd';
  roundNumber: number;
  finishCount: number;
}

const CARD_RANKS: Record<string, number> = {
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
  'A': 14,
  '2': 15, // 2 is highest
};

const getCardRank = (card: Card): number => CARD_RANKS[card.rank];

export const createAssholeGame = (
  playerNames: string[],
  playerTypes: ('human' | 'computer')[]
): AssholeState => {
  const deck = shuffleDeck(createDeck());
  const playerCount = playerNames.length;
  const cardsPerPlayer = Math.floor(52 / playerCount);
  
  const players: AssholePlayer[] = playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    type: playerTypes[index] || 'computer',
    hand: sortCards(
      deck.cards.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer)
        .map(c => ({ ...c, faceUp: true }))
    ),
    rank: null,
    finishOrder: null,
    hasPassed: false,
  }));
  
  // Find player with 3 of clubs to start
  const starterIndex = players.findIndex(p =>
    p.hand.some(c => c.suit === 'clubs' && c.rank === '3')
  );
  
  return {
    players,
    currentPlayerIndex: starterIndex !== -1 ? starterIndex : 0,
    pile: [],
    lastPlayedBy: null,
    currentRank: null,
    currentCount: 0,
    consecutivePasses: 0,
    phase: 'playing',
    roundNumber: 1,
    finishCount: 0,
  };
};

export const isValidPlay = (
  state: AssholeState,
  playerId: string,
  cards: Card[]
): boolean => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  
  if (cards.length === 0) return false;
  
  // All cards must have the same rank
  const rank = getCardRank(cards[0]);
  if (!cards.every(c => getCardRank(c) === rank)) return false;
  
  // Player must have all cards
  const hasAllCards = cards.every(card =>
    player.hand.some(h => h.id === card.id)
  );
  if (!hasAllCards) return false;
  
  // If pile is empty (new round), any valid combo works
  if (state.currentRank === null) {
    return true;
  }
  
  // Must play same number of cards
  if (cards.length !== state.currentCount) return false;
  
  // Must be higher rank
  if (rank <= state.currentRank) return false;
  
  return true;
};

export const playCards = (
  state: AssholeState,
  playerId: string,
  cards: Card[]
): AssholeState | null => {
  if (!isValidPlay(state, playerId, cards)) return null;
  
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const newPlayers = [...state.players];
  
  // Remove cards from player's hand
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand: newPlayers[playerIndex].hand.filter(h => !cards.some(c => c.id === h.id)),
    hasPassed: false,
  };
  
  const rank = getCardRank(cards[0]);
  
  // Check if player has finished
  if (newPlayers[playerIndex].hand.length === 0) {
    const finishOrder = state.finishCount + 1;
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      finishOrder,
    };
    
    // Assign ranks based on finish order
    const totalPlayers = state.players.length;
    if (finishOrder === 1) {
      newPlayers[playerIndex].rank = 'president';
    } else if (finishOrder === 2 && totalPlayers >= 4) {
      newPlayers[playerIndex].rank = 'vice-president';
    } else if (finishOrder === totalPlayers - 1 && totalPlayers >= 4) {
      newPlayers[playerIndex].rank = 'vice-asshole';
    } else if (finishOrder === totalPlayers) {
      newPlayers[playerIndex].rank = 'asshole';
    } else {
      newPlayers[playerIndex].rank = 'neutral';
    }
  }
  
  // Special rule: 2s clear the pile
  const clearedByTwo = rank === 15;
  
  // Check if round/game is over
  const activePlayers = newPlayers.filter(p => p.hand.length > 0);
  if (activePlayers.length <= 1) {
    // Last player is asshole
    if (activePlayers.length === 1) {
      const lastPlayer = newPlayers.findIndex(p => p.id === activePlayers[0].id);
      newPlayers[lastPlayer] = {
        ...newPlayers[lastPlayer],
        finishOrder: state.players.length,
        rank: 'asshole',
      };
    }
    
    return {
      ...state,
      players: newPlayers,
      phase: 'roundEnd',
    };
  }
  
  // Find next player
  const nextIndex = findNextPlayer(newPlayers, playerIndex);
  
  return {
    ...state,
    players: newPlayers,
    pile: [...state.pile, cards],
    lastPlayedBy: playerId,
    currentRank: clearedByTwo ? null : rank,
    currentCount: clearedByTwo ? 0 : cards.length,
    consecutivePasses: 0,
    currentPlayerIndex: clearedByTwo ? playerIndex : nextIndex, // 2s let you go again
    finishCount: newPlayers[playerIndex].hand.length === 0 ? state.finishCount + 1 : state.finishCount,
  };
};

export const pass = (state: AssholeState, playerId: string): AssholeState | null => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  // Cannot pass if pile is empty (must play something)
  if (state.currentRank === null) return null;
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hasPassed: true,
  };
  
  const newConsecutivePasses = state.consecutivePasses + 1;
  const activePlayers = newPlayers.filter(p => p.hand.length > 0);
  
  // If all active players passed, clear the pile
  if (newConsecutivePasses >= activePlayers.length - 1) {
    // Last player to play starts new round
    const lastPlayedIndex = state.players.findIndex(p => p.id === state.lastPlayedBy);
    const nextIndex = findNextPlayer(newPlayers, lastPlayedIndex - 1);
    
    return {
      ...state,
      players: newPlayers.map(p => ({ ...p, hasPassed: false })),
      pile: [],
      currentRank: null,
      currentCount: 0,
      consecutivePasses: 0,
      currentPlayerIndex: nextIndex,
    };
  }
  
  const nextIndex = findNextPlayer(newPlayers, playerIndex);
  
  return {
    ...state,
    players: newPlayers,
    consecutivePasses: newConsecutivePasses,
    currentPlayerIndex: nextIndex,
  };
};

const findNextPlayer = (players: AssholePlayer[], currentIndex: number): number => {
  let next = (currentIndex + 1) % players.length;
  let attempts = 0;
  
  while (players[next].hand.length === 0 && attempts < players.length) {
    next = (next + 1) % players.length;
    attempts++;
  }
  
  return next;
};

export const startNewRound = (state: AssholeState): AssholeState => {
  const deck = shuffleDeck(createDeck());
  const playerCount = state.players.length;
  const cardsPerPlayer = Math.floor(52 / playerCount);
  
  // Deal cards based on rank
  const newPlayers = state.players.map((player, index) => ({
    ...player,
    hand: sortCards(
      deck.cards.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer)
        .map(c => ({ ...c, faceUp: true }))
    ),
    finishOrder: null,
    hasPassed: false,
  }));
  
  // Trading phase (President and Asshole swap cards)
  // Note: president, vicePresident, viceAsshole vars reserved for future trading implementation
  const asshole = newPlayers.find(p => p.rank === 'asshole');
  
  // For now, skip trading and start playing
  // In a full implementation, you'd have a trading phase
  
  // Asshole starts (player with 3 of clubs in first round, then asshole in subsequent rounds)
  const starterIndex = asshole
    ? newPlayers.findIndex(p => p.id === asshole.id)
    : newPlayers.findIndex(p => p.hand.some(c => c.suit === 'clubs' && c.rank === '3'));
  
  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: starterIndex !== -1 ? starterIndex : 0,
    pile: [],
    lastPlayedBy: null,
    currentRank: null,
    currentCount: 0,
    consecutivePasses: 0,
    phase: 'playing',
    roundNumber: state.roundNumber + 1,
    finishCount: 0,
  };
};

export const getValidPlays = (state: AssholeState, playerId: string): Card[][] => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];
  
  const validPlays: Card[][] = [];
  const hand = player.hand;
  
  // Group cards by rank
  const cardsByRank: Map<number, Card[]> = new Map();
  for (const card of hand) {
    const rank = getCardRank(card);
    if (!cardsByRank.has(rank)) {
      cardsByRank.set(rank, []);
    }
    cardsByRank.get(rank)!.push(card);
  }
  
  // Generate all possible plays
  for (const [rank, cards] of cardsByRank) {
    if (state.currentRank === null) {
      // Can play any valid combo
      for (let i = 1; i <= cards.length; i++) {
        const combos = getCombinations(cards, i);
        validPlays.push(...combos);
      }
    } else {
      // Must beat current play
      if (rank > state.currentRank && cards.length >= state.currentCount) {
        const combos = getCombinations(cards, state.currentCount);
        validPlays.push(...combos);
      }
    }
  }
  
  return validPlays;
};

const getCombinations = (cards: Card[], k: number): Card[][] => {
  if (k > cards.length) return [];
  if (k === cards.length) return [cards];
  if (k === 1) return cards.map(c => [c]);
  
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

// AI helper
export const computerSelectPlay = (state: AssholeState, playerId: string): Card[] | null => {
  const validPlays = getValidPlays(state, playerId);
  
  if (validPlays.length === 0) {
    return null; // Will pass
  }
  
  // Simple strategy: play lowest valid cards
  validPlays.sort((a, b) => {
    const rankA = getCardRank(a[0]);
    const rankB = getCardRank(b[0]);
    if (rankA !== rankB) return rankA - rankB;
    return a.length - b.length; // Prefer fewer cards
  });
  
  return validPlays[0];
};

export const getWinner = (state: AssholeState): AssholePlayer | null => {
  if (state.phase !== 'roundEnd') return null;
  return state.players.find(p => p.rank === 'president') || null;
};
