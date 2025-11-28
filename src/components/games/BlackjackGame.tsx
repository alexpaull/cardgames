'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PlayingCard } from '@/components/cards';
import { Button } from '@/components/ui';
import {
  BlackjackState,
  createBlackjackGame,
  placeBet,
  dealInitialCards,
  hit,
  stand,
  dealerPlay,
  settleRound,
  startNewRound,
  getHandValue,
} from '@/lib/games/blackjack';

interface BlackjackGameProps {
  onBack?: () => void;
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<BlackjackState>(() => 
    createBlackjackGame(['Player'], 1000)
  );
  const [betAmount, setBetAmount] = useState(20);
  const [message, setMessage] = useState<string>('');

  const player = gameState.players[0];
  const dealer = gameState.dealer;
  const playerHandValue = player ? getHandValue(player.hand) : { value: 0, isSoft: false };
  const dealerHandValue = dealer ? getHandValue(dealer.hand) : { value: 0, isSoft: false };

  const handlePlaceBet = useCallback(() => {
    const newState = placeBet(gameState, player.id, betAmount);
    if (newState) {
      const dealtState = dealInitialCards(newState);
      setGameState(dealtState);
      setMessage('');
      
      // If player has blackjack, automatically proceed to dealer's turn
      if (dealtState.players[0].hasBlackjack) {
        setMessage('Blackjack!');
        setTimeout(() => {
          const dealerState = dealerPlay(dealtState);
          setGameState(dealerState);
          
          setTimeout(() => {
            const finalState = settleRound(dealerState);
            setGameState(finalState);
            
            if (dealtState.players[0].hasBlackjack && !dealerState.dealer.hasBlackjack) {
              setMessage('Blackjack! You win 3:2!');
            } else if (dealerState.dealer.hasBlackjack) {
              setMessage('Push - both have Blackjack!');
            }
          }, 500);
        }, 1000);
      }
    }
  }, [gameState, player?.id, betAmount]);

  const handleHit = useCallback(() => {
    const newState = hit(gameState, player.id);
    if (newState) {
      setGameState(newState);
      
      if (newState.players[0].hasBusted) {
        setMessage('Bust! You lose.');
        setTimeout(() => {
          const finalState = settleRound(newState);
          setGameState(finalState);
        }, 1000);
      }
    }
  }, [gameState, player?.id]);

  const handleStand = useCallback(() => {
    const standState = stand(gameState, player.id);
    if (standState) {
      // Dealer's turn
      setTimeout(() => {
        const dealerState = dealerPlay(standState);
        setGameState(dealerState);
        
        setTimeout(() => {
          const finalState = settleRound(dealerState);
          setGameState(finalState);
          
          // Set result message
          const playerValue = getHandValue(finalState.players[0].hand).value;
          const dealerValue = getHandValue(finalState.dealer.hand).value;
          
          if (finalState.players[0].hasBlackjack && !finalState.dealer.hasBlackjack) {
            setMessage('Blackjack! You win 3:2!');
          } else if (finalState.dealer.hasBusted) {
            setMessage('Dealer busts! You win!');
          } else if (playerValue > dealerValue) {
            setMessage('You win!');
          } else if (playerValue < dealerValue) {
            setMessage('Dealer wins.');
          } else {
            setMessage('Push (tie).');
          }
        }, 500);
      }, 500);
    }
  }, [gameState, player?.id]);

  const handleNewRound = useCallback(() => {
    const newState = startNewRound(gameState);
    setGameState(newState);
    setMessage('');
  }, [gameState]);

  const handleNewGame = useCallback(() => {
    setGameState(createBlackjackGame(['Player'], 1000));
    setMessage('');
  }, []);

  const formatHandValue = (hand: { value: number; isSoft: boolean }): string => {
    if (hand.isSoft && hand.value <= 21) {
      return `${hand.value - 10}/${hand.value}`;
    }
    return hand.value.toString();
  };

  return (
    <div className="min-h-screen bg-green-800 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 text-white">
        <div className="flex gap-4">
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              ← Back
            </Button>
          )}
          <Button onClick={handleNewGame}>New Game</Button>
        </div>
        <div className="text-xl font-bold">
          Chips: ${player?.chips || 0}
        </div>
      </div>

      {/* Dealer Area */}
      <div className="text-center mb-12">
        <h2 className="text-white text-xl mb-4">
          Dealer {gameState.phase !== 'betting' && gameState.phase !== 'playing' && (
            <span className="text-yellow-400">({formatHandValue(dealerHandValue)})</span>
          )}
        </h2>
        <div className="flex justify-center gap-2 min-h-[100px]">
          {dealer.hand.map((card) => (
            <PlayingCard key={card.id} card={card} size="lg" />
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="text-center mb-8">
          <span className="bg-black bg-opacity-50 text-white text-2xl px-6 py-3 rounded-lg">
            {message}
          </span>
        </div>
      )}

      {/* Player Area */}
      <div className="text-center mb-8">
        <div className="flex justify-center gap-2 min-h-[100px] mb-4">
          {player.hand.map((card) => (
            <PlayingCard key={card.id} card={card} size="lg" />
          ))}
        </div>
        <h2 className="text-white text-xl">
          Your Hand {player.hand.length > 0 && (
            <span className="text-yellow-400">({formatHandValue(playerHandValue)})</span>
          )}
        </h2>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {gameState.phase === 'betting' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <label>Bet:</label>
              <select
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value))}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                {[5, 10, 20, 50, 100].filter(v => v <= player.chips).map(value => (
                  <option key={value} value={value}>${value}</option>
                ))}
              </select>
            </div>
            <Button onClick={handlePlaceBet} size="lg">
              Deal
            </Button>
          </div>
        )}

        {gameState.phase === 'playing' && !player.hasStood && !player.hasBusted && (
          <>
            <Button onClick={handleHit} size="lg">
              Hit
            </Button>
            <Button onClick={handleStand} size="lg" variant="secondary">
              Stand
            </Button>
          </>
        )}

        {gameState.phase === 'finished' && (
          <Button onClick={handleNewRound} size="lg">
            Next Round
          </Button>
        )}
      </div>

      {/* Bet display */}
      {player.bet > 0 && gameState.phase !== 'betting' && (
        <div className="text-center mt-4 text-white">
          <span className="bg-yellow-600 px-4 py-2 rounded-full">
            Bet: ${player.bet}
          </span>
        </div>
      )}
    </div>
  );
};

export default BlackjackGame;
