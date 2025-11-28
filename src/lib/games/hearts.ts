import { Card, Suit } from '@/types';
import { createDeck, shuffleDeck, sortCards } from '@/lib/engine';

export interface HeartsPlayer {
  id: string;
  name: string;
  type: 'human' | 'computer';
  hand: Card[];
  tricks: Card[][];
  score: number;
  roundScore: number;
  passedCards: Card[];
  receivedCards: Card[];
}

export interface HeartsState {
  players: HeartsPlayer[];
  currentPlayerIndex: number;
  currentTrick: { playerId: string; card: Card }[];
  leadSuit: Suit | null;
  heartsBroken: boolean;
  phase: 'passing' | 'playing' | 'roundEnd' | 'gameEnd';
  passDirection: 'left' | 'right' | 'across' | 'none';
  roundNumber: number;
  gameScore: number; // Score to end game (typically 100)
}

const PASS_DIRECTIONS: ('left' | 'right' | 'across' | 'none')[] = ['left', 'right', 'across', 'none'];

export const createHeartsGame = (
  playerNames: string[],
  playerTypes: ('human' | 'computer')[] = ['human', 'computer', 'computer', 'computer']
): HeartsState => {
  const deck = shuffleDeck(createDeck());
  
  const players: HeartsPlayer[] = playerNames.slice(0, 4).map((name, index) => ({
    id: `player-${index}`,
    name,
    type: playerTypes[index] || 'computer',
    hand: [],
    tricks: [],
    score: 0,
    roundScore: 0,
    passedCards: [],
    receivedCards: [],
  }));
  
  // Deal 13 cards to each player
  let cardIndex = 0;
  for (let i = 0; i < 4; i++) {
    players[i].hand = sortCards(deck.cards.slice(cardIndex, cardIndex + 13).map(c => ({ ...c, faceUp: true })));
    cardIndex += 13;
  }
  
  return {
    players,
    currentPlayerIndex: findTwoOfClubs(players),
    currentTrick: [],
    leadSuit: null,
    heartsBroken: false,
    phase: 'passing',
    passDirection: 'left',
    roundNumber: 1,
    gameScore: 100,
  };
};

const findTwoOfClubs = (players: HeartsPlayer[]): number => {
  for (let i = 0; i < players.length; i++) {
    if (players[i].hand.some(c => c.suit === 'clubs' && c.rank === '2')) {
      return i;
    }
  }
  return 0;
};

export const passCards = (state: HeartsState, playerId: string, cards: Card[]): HeartsState | null => {
  if (cards.length !== 3) return null;
  if (state.passDirection === 'none') return null;
  
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  const player = state.players[playerIndex];
  
  // Verify player has all cards
  const hasAllCards = cards.every(card =>
    player.hand.some(h => h.id === card.id)
  );
  if (!hasAllCards) return null;
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    passedCards: cards,
    hand: player.hand.filter(h => !cards.some(c => c.id === h.id)),
  };
  
  return { ...state, players: newPlayers };
};

export const executePassPhase = (state: HeartsState): HeartsState => {
  // Check if all players have selected cards to pass
  if (!state.players.every(p => p.passedCards.length === 3)) {
    return state;
  }
  
  const newPlayers = [...state.players];
  
  for (let i = 0; i < 4; i++) {
    let targetIndex: number;
    switch (state.passDirection) {
      case 'left':
        targetIndex = (i + 1) % 4;
        break;
      case 'right':
        targetIndex = (i + 3) % 4;
        break;
      case 'across':
        targetIndex = (i + 2) % 4;
        break;
      default:
        targetIndex = i;
    }
    
    newPlayers[targetIndex] = {
      ...newPlayers[targetIndex],
      receivedCards: state.players[i].passedCards,
      hand: sortCards([...newPlayers[targetIndex].hand, ...state.players[i].passedCards]),
    };
  }
  
  // Clear passed cards
  for (let i = 0; i < 4; i++) {
    newPlayers[i] = {
      ...newPlayers[i],
      passedCards: [],
    };
  }
  
  return {
    ...state,
    players: newPlayers,
    phase: 'playing',
    currentPlayerIndex: findTwoOfClubs(newPlayers),
  };
};

export const isValidPlay = (state: HeartsState, playerId: string, card: Card): boolean => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return false;
  
  const player = state.players[playerIndex];
  const hasCard = player.hand.some(h => h.id === card.id);
  if (!hasCard) return false;
  
  // First trick must start with 2 of clubs
  if (state.currentTrick.length === 0 && state.roundNumber === 1 && state.players.every(p => p.tricks.length === 0)) {
    const isFirstTrick = state.players.every(p => p.tricks.length === 0);
    if (isFirstTrick && !(card.suit === 'clubs' && card.rank === '2')) {
      const hasTwoOfClubs = player.hand.some(c => c.suit === 'clubs' && c.rank === '2');
      if (hasTwoOfClubs) return false;
    }
  }
  
  // Must follow suit if possible
  if (state.leadSuit && card.suit !== state.leadSuit) {
    const hasLeadSuit = player.hand.some(c => c.suit === state.leadSuit);
    if (hasLeadSuit) return false;
  }
  
  // Cannot lead hearts until broken (unless only hearts in hand)
  if (state.currentTrick.length === 0 && card.suit === 'hearts' && !state.heartsBroken) {
    const hasNonHearts = player.hand.some(c => c.suit !== 'hearts');
    if (hasNonHearts) return false;
  }
  
  // Cannot play hearts or Queen of Spades on first trick
  const isFirstTrick = state.players.every(p => p.tricks.length === 0);
  if (isFirstTrick && (card.suit === 'hearts' || (card.suit === 'spades' && card.rank === 'Q'))) {
    const hasOther = player.hand.some(c => 
      c.suit !== 'hearts' && !(c.suit === 'spades' && c.rank === 'Q')
    );
    if (hasOther) return false;
  }
  
  return true;
};

export const playCard = (state: HeartsState, playerId: string, card: Card): HeartsState | null => {
  if (!isValidPlay(state, playerId, card)) return null;
  
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const newPlayers = [...state.players];
  
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand: newPlayers[playerIndex].hand.filter(h => h.id !== card.id),
  };
  
  const newTrick = [...state.currentTrick, { playerId, card }];
  let newLeadSuit = state.leadSuit;
  let heartsBroken = state.heartsBroken;
  
  if (newTrick.length === 1) {
    newLeadSuit = card.suit;
  }
  
  if (card.suit === 'hearts') {
    heartsBroken = true;
  }
  
  // Check if trick is complete
  if (newTrick.length === 4) {
    return completeTrick({ ...state, players: newPlayers, currentTrick: newTrick, leadSuit: newLeadSuit, heartsBroken });
  }
  
  return {
    ...state,
    players: newPlayers,
    currentTrick: newTrick,
    leadSuit: newLeadSuit,
    heartsBroken,
    currentPlayerIndex: (playerIndex + 1) % 4,
  };
};

const completeTrick = (state: HeartsState): HeartsState => {
  // Find winner (highest card of lead suit)
  const leadSuit = state.leadSuit!;
  let winnerIndex = 0;
  let highestValue = 0;
  
  for (let i = 0; i < state.currentTrick.length; i++) {
    const { card } = state.currentTrick[i];
    if (card.suit === leadSuit && card.value > highestValue) {
      highestValue = card.value;
      winnerIndex = i;
    }
  }
  
  const winnerId = state.currentTrick[winnerIndex].playerId;
  const winnerPlayerIndex = state.players.findIndex(p => p.id === winnerId);
  
  const newPlayers = [...state.players];
  const trickCards = state.currentTrick.map(t => t.card);
  newPlayers[winnerPlayerIndex] = {
    ...newPlayers[winnerPlayerIndex],
    tricks: [...newPlayers[winnerPlayerIndex].tricks, trickCards],
    roundScore: newPlayers[winnerPlayerIndex].roundScore + calculateTrickPoints(trickCards),
  };
  
  // Check if round is complete
  const roundComplete = newPlayers.every(p => p.hand.length === 0);
  
  if (roundComplete) {
    return completeRound({ ...state, players: newPlayers });
  }
  
  return {
    ...state,
    players: newPlayers,
    currentTrick: [],
    leadSuit: null,
    currentPlayerIndex: winnerPlayerIndex,
  };
};

const calculateTrickPoints = (cards: Card[]): number => {
  let points = 0;
  for (const card of cards) {
    if (card.suit === 'hearts') {
      points += 1;
    } else if (card.suit === 'spades' && card.rank === 'Q') {
      points += 13;
    }
  }
  return points;
};

const completeRound = (state: HeartsState): HeartsState => {
  const newPlayers = [...state.players];
  
  // Check for shooting the moon
  const moonShooter = newPlayers.find(p => p.roundScore === 26);
  
  if (moonShooter) {
    // Give 26 points to everyone else
    for (const player of newPlayers) {
      if (player.id === moonShooter.id) {
        player.score += 0;
      } else {
        player.score += 26;
      }
    }
  } else {
    for (const player of newPlayers) {
      player.score += player.roundScore;
    }
  }
  
  // Check for game end
  const maxScore = Math.max(...newPlayers.map(p => p.score));
  if (maxScore >= state.gameScore) {
    return {
      ...state,
      players: newPlayers,
      phase: 'gameEnd',
    };
  }
  
  // Start new round
  return startNewRound({ ...state, players: newPlayers });
};

const startNewRound = (state: HeartsState): HeartsState => {
  const deck = shuffleDeck(createDeck());
  const newPlayers = state.players.map((p, index) => ({
    ...p,
    hand: sortCards(deck.cards.slice(index * 13, (index + 1) * 13).map(c => ({ ...c, faceUp: p.type === 'human' }))),
    tricks: [],
    roundScore: 0,
    passedCards: [],
    receivedCards: [],
  }));
  
  const passDirectionIndex = (state.roundNumber) % 4;
  
  return {
    ...state,
    players: newPlayers,
    currentTrick: [],
    leadSuit: null,
    heartsBroken: false,
    phase: PASS_DIRECTIONS[passDirectionIndex] === 'none' ? 'playing' : 'passing',
    passDirection: PASS_DIRECTIONS[passDirectionIndex],
    roundNumber: state.roundNumber + 1,
    currentPlayerIndex: findTwoOfClubs(newPlayers),
  };
};

export const getWinner = (state: HeartsState): HeartsPlayer | null => {
  if (state.phase !== 'gameEnd') return null;
  
  let winner = state.players[0];
  for (const player of state.players) {
    if (player.score < winner.score) {
      winner = player;
    }
  }
  return winner;
};

// AI Helper functions
export const getValidPlays = (state: HeartsState, playerId: string): Card[] => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];
  
  return player.hand.filter(card => isValidPlay(state, playerId, card));
};

export const computerSelectPassCards = (player: HeartsPlayer): Card[] => {
  // Simple strategy: pass highest cards and Queen of Spades if present
  const sorted = [...player.hand].sort((a, b) => {
    // Queen of Spades is highest priority to pass
    if (a.suit === 'spades' && a.rank === 'Q') return -1;
    if (b.suit === 'spades' && b.rank === 'Q') return 1;
    // Then high hearts
    if (a.suit === 'hearts' && b.suit !== 'hearts') return -1;
    if (b.suit === 'hearts' && a.suit !== 'hearts') return 1;
    // Then by value
    return b.value - a.value;
  });
  
  return sorted.slice(0, 3);
};

export const computerSelectCard = (state: HeartsState, playerId: string): Card | null => {
  const validPlays = getValidPlays(state, playerId);
  if (validPlays.length === 0) return null;
  
  // Simple strategy: play lowest valid card, avoid taking tricks with points
  if (state.currentTrick.length === 3) {
    // Last to play - try to avoid winning if there are points
    const hasPoints = state.currentTrick.some(t => 
      t.card.suit === 'hearts' || (t.card.suit === 'spades' && t.card.rank === 'Q')
    );
    
    if (hasPoints) {
      // Try to play under the current winner
      const leadSuit = state.leadSuit!;
      const winningCard = state.currentTrick
        .filter(t => t.card.suit === leadSuit)
        .sort((a, b) => b.card.value - a.card.value)[0];
      
      const safeCards = validPlays.filter(c => 
        c.suit !== leadSuit || c.value < winningCard.card.value
      );
      
      if (safeCards.length > 0) {
        return safeCards.sort((a, b) => b.value - a.value)[0];
      }
    }
  }
  
  // Play lowest card
  return validPlays.sort((a, b) => a.value - b.value)[0];
};
