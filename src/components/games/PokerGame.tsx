'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PlayingCard } from '@/components/cards';
import { Button } from '@/components/ui';
import {
  PokerState,
  createPokerGame,
  postBlinds,
  dealHoleCards,
  fold,
  call,
  raise,
  check,
  allIn,
  computerAction,
  evaluateHand,
  startNewRound,
} from '@/lib/games/poker';

interface PokerGameProps {
  onBack?: () => void;
}

export const PokerGame: React.FC<PokerGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<PokerState | null>(() => {
    // Initialize game synchronously to avoid setState in effect
    const state = createPokerGame(
      ['You', 'Bot 1', 'Bot 2', 'Bot 3'],
      ['human', 'computer', 'computer', 'computer'],
      1000,
      10,
      20
    );
    let newState = postBlinds(state);
    newState = dealHoleCards(newState);
    return newState;
  });
  const [raiseAmount, setRaiseAmount] = useState(20);

  const humanPlayer = gameState?.players[0];
  const isHumanTurn = gameState?.currentPlayerIndex === 0 && 
                      !humanPlayer?.hasFolded && 
                      !humanPlayer?.isAllIn &&
                      gameState?.phase !== 'showdown' &&
                      gameState?.phase !== 'finished';

  // Compute message based on state (avoids setState in effect)
  const message = useMemo(() => {
    if (!gameState || !humanPlayer) return '';

    if (gameState.phase === 'finished' && gameState.winners) {
      const winner = gameState.winners[0];
      const winnerPlayer = gameState.players.find(p => p.id === winner.playerId);
      return `${winnerPlayer?.name} wins $${winner.amount} with ${winner.hand}!`;
    } else if (isHumanTurn) {
      const callAmount = gameState.currentBet - humanPlayer.currentBet;
      if (callAmount > 0) {
        return `Your turn - Call $${callAmount}, raise, or fold`;
      } else {
        return 'Your turn - Check or raise';
      }
    } else if (!humanPlayer.hasFolded) {
      return `${gameState.players[gameState.currentPlayerIndex].name}'s turn`;
    } else {
      return 'You folded';
    }
  }, [gameState, humanPlayer, isHumanTurn]);

  // Computer AI turns
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === 'showdown' || gameState.phase === 'finished') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.type !== 'computer' || currentPlayer.hasFolded || currentPlayer.isAllIn) {
      return;
    }

    const timer = setTimeout(() => {
      const action = computerAction(gameState, currentPlayer.id);
      let newState: PokerState | null = null;

      switch (action.action) {
        case 'fold':
          newState = fold(gameState, currentPlayer.id);
          break;
        case 'call':
          newState = call(gameState, currentPlayer.id);
          break;
        case 'raise':
          newState = raise(gameState, currentPlayer.id, action.amount || gameState.bigBlind);
          break;
        case 'check':
          newState = check(gameState, currentPlayer.id);
          break;
        case 'all-in':
          newState = allIn(gameState, currentPlayer.id);
          break;
      }

      if (newState) {
        setGameState(newState);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState]);

  const handleFold = useCallback(() => {
    if (!gameState || !humanPlayer) return;
    const newState = fold(gameState, humanPlayer.id);
    if (newState) setGameState(newState);
  }, [gameState, humanPlayer]);

  const handleCall = useCallback(() => {
    if (!gameState || !humanPlayer) return;
    const newState = call(gameState, humanPlayer.id);
    if (newState) setGameState(newState);
  }, [gameState, humanPlayer]);

  const handleCheck = useCallback(() => {
    if (!gameState || !humanPlayer) return;
    const newState = check(gameState, humanPlayer.id);
    if (newState) setGameState(newState);
  }, [gameState, humanPlayer]);

  const handleRaise = useCallback(() => {
    if (!gameState || !humanPlayer) return;
    const newState = raise(gameState, humanPlayer.id, raiseAmount);
    if (newState) setGameState(newState);
  }, [gameState, humanPlayer, raiseAmount]);

  const handleAllIn = useCallback(() => {
    if (!gameState || !humanPlayer) return;
    const newState = allIn(gameState, humanPlayer.id);
    if (newState) setGameState(newState);
  }, [gameState, humanPlayer]);

  const handleNewRound = useCallback(() => {
    if (!gameState) return;
    const newState = startNewRound(gameState);
    setGameState(newState);
  }, [gameState]);

  const handleNewGame = useCallback(() => {
    const state = createPokerGame(
      ['You', 'Bot 1', 'Bot 2', 'Bot 3'],
      ['human', 'computer', 'computer', 'computer'],
      1000,
      10,
      20
    );
    let newState = postBlinds(state);
    newState = dealHoleCards(newState);
    setGameState(newState);
  }, []);

  if (!gameState || !humanPlayer) {
    return <div className="min-h-screen bg-green-800 flex items-center justify-center text-white">Loading...</div>;
  }

  const callAmount = gameState.currentBet - humanPlayer.currentBet;
  const canCheck = callAmount === 0;

  return (
    <div className="min-h-screen bg-green-800 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 text-white">
        <div className="flex gap-4">
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              ← Back
            </Button>
          )}
          <Button onClick={handleNewGame}>New Game</Button>
        </div>
        <div className="text-lg">
          Round {gameState.roundNumber} | Blinds: ${gameState.smallBlind}/${gameState.bigBlind}
        </div>
      </div>

      {/* Message */}
      <div className="text-center mb-4">
        <span className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
          {message}
        </span>
      </div>

      {/* Pot */}
      <div className="text-center mb-4">
        <span className="bg-yellow-600 text-white px-6 py-2 rounded-full text-xl font-bold">
          Pot: ${gameState.pot}
        </span>
      </div>

      {/* Other players */}
      <div className="flex justify-center gap-8 mb-8">
        {gameState.players.slice(1).map(player => (
          <div key={player.id} className="text-center text-white">
            <div className={`font-bold ${player.hasFolded ? 'opacity-50' : ''}`}>
              {player.name} {player.isDealer && '(D)'}
            </div>
            <div className="text-sm">Chips: ${player.chips}</div>
            {player.currentBet > 0 && (
              <div className="text-yellow-400 text-sm">Bet: ${player.currentBet}</div>
            )}
            <div className="flex gap-1 justify-center mt-2">
              {player.hand.map((card, i) => (
                <PlayingCard 
                  key={i} 
                  card={card} 
                  size="sm"
                />
              ))}
            </div>
            {player.hasFolded && <div className="text-red-400 text-sm">Folded</div>}
            {player.isAllIn && <div className="text-yellow-400 text-sm">All In</div>}
          </div>
        ))}
      </div>

      {/* Community Cards */}
      <div className="flex justify-center gap-2 mb-8 min-h-[100px]">
        {gameState.communityCards.map(card => (
          <PlayingCard key={card.id} card={card} size="lg" />
        ))}
        {[...Array(5 - gameState.communityCards.length)].map((_, i) => (
          <div key={i} className="w-24 h-36 border-2 border-dashed border-green-600 rounded-lg" />
        ))}
      </div>

      {/* Player info */}
      <div className="text-center text-white mb-4">
        <span className="text-xl font-bold">{humanPlayer.name}</span>
        <span className="ml-4">Chips: ${humanPlayer.chips}</span>
        {humanPlayer.currentBet > 0 && (
          <span className="ml-4 text-yellow-400">Bet: ${humanPlayer.currentBet}</span>
        )}
      </div>

      {/* Player's cards */}
      <div className="flex justify-center gap-2 mb-8">
        {humanPlayer.hand.map(card => (
          <PlayingCard key={card.id} card={{ ...card, faceUp: true }} size="lg" />
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 flex-wrap">
        {isHumanTurn && (
          <>
            <Button onClick={handleFold} variant="danger">
              Fold
            </Button>
            {canCheck ? (
              <Button onClick={handleCheck} variant="secondary">
                Check
              </Button>
            ) : (
              <Button onClick={handleCall}>
                Call ${callAmount}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Math.max(gameState.minRaise, parseInt(e.target.value) || 0))}
                className="w-20 px-2 py-2 rounded bg-gray-700 text-white"
                min={gameState.minRaise}
              />
              <Button onClick={handleRaise} variant="success">
                Raise
              </Button>
            </div>
            <Button onClick={handleAllIn} variant="danger">
              All In
            </Button>
          </>
        )}

        {gameState.phase === 'finished' && (
          <Button onClick={handleNewRound} size="lg">
            Next Round
          </Button>
        )}
      </div>

      {/* Show hand evaluation at showdown */}
      {(gameState.phase === 'showdown' || gameState.phase === 'finished') && 
       humanPlayer.hand.length > 0 && 
       gameState.communityCards.length === 5 && (
        <div className="text-center mt-4 text-white">
          <span className="bg-black bg-opacity-50 px-4 py-2 rounded">
            Your hand: {evaluateHand(humanPlayer.hand, gameState.communityCards).description}
          </span>
        </div>
      )}
    </div>
  );
};

export default PokerGame;
