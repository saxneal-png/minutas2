import { getValidCaptures, getCardValue, getPrimeraValue } from './gameLogic.js';

// Heurística de valor de captura para la IA
function evaluateCapture(captureCards, playedCard) {
  let score = 0;
  const allCards = [...captureCards, playedCard];
  
  // Puntos por cantidad de cartas
  score += allCards.length * 10;
  
  for (const card of allCards) {
    if (card.suit === 'oros') {
      score += 20; // Prioridad alta a los oros
      if (card.rank === 7) {
        score += 100; // Prioridad máxima al 7 de oros
      }
    }
    // Valor para 'la primera'
    score += getPrimeraValue(card);
  }
  
  return score;
}

// Evalúa qué tan "peligroso" es dejar ciertas cartas en la mesa
function evaluateTableDanger(tableCards) {
  let danger = 0;
  // Si dejamos la mesa vacía, es peligroso porque el jugador no puede hacer nada, pero no da escoba (bueno, si la acabamos de limpiar sí).
  // Si dejamos cartas que suman menos de 15, alguien con la carta exacta se lo lleva.
  // Mientras más cerca de 15, o si dejamos Oros/7 de Oros, es más peligroso.
  for (const card of tableCards) {
    if (card.suit === 'oros') danger += 15;
    if (card.suit === 'oros' && card.rank === 7) danger += 80;
  }
  return danger;
}

export function determineAIMove(aiHand, tableCards, difficulty) {
  let bestMove = null;
  let bestScore = -Infinity;
  let possibleMoves = [];

  // Encontrar todos los movimientos posibles
  for (const card of aiHand) {
    const captures = getValidCaptures(card, tableCards);
    if (captures.length > 0) {
      for (const capture of captures) {
        possibleMoves.push({
          type: 'capture',
          card: card,
          capture: capture
        });
      }
    } else {
      possibleMoves.push({
        type: 'discard',
        card: card,
        capture: []
      });
    }
  }

  // Si no hay movimientos (no debería pasar si aiHand tiene cartas), retornar null
  if (possibleMoves.length === 0) return null;

  if (difficulty === 1) {
    // Nivel 1: Totalmente aleatorio
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  }

  if (difficulty === 2) {
    // Nivel 2: Hace capturas si puede, si no, descarta al azar
    const captures = possibleMoves.filter(m => m.type === 'capture');
    if (captures.length > 0) {
      return captures[Math.floor(Math.random() * captures.length)];
    } else {
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }
  }

  if (difficulty === 3) {
    // Nivel 3: Greedy. Busca la captura con mayor valor heurístico.
    for (const move of possibleMoves) {
      if (move.type === 'capture') {
        const score = evaluateCapture(move.capture, move.card);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    // Si no hay capturas, descarta la carta de menor valor heurístico (para no regalarla)
    if (!bestMove) {
      let minLoss = Infinity;
      for (const move of possibleMoves) {
        const loss = evaluateCapture([], move.card);
        if (loss < minLoss) {
          minLoss = loss;
          bestMove = move;
        }
      }
    }
    
    return bestMove;
  }

  if (difficulty === 4) {
    // Nivel 4: Maestro. Minimiza el peligro dejado en la mesa además de maximizar su ganancia.
    for (const move of possibleMoves) {
      let moveScore = 0;
      
      if (move.type === 'capture') {
        moveScore += evaluateCapture(move.capture, move.card);
        // Evaluar mesa resultante
        const remainingTable = tableCards.filter(c => !move.capture.includes(c));
        if (remainingTable.length === 0) {
          moveScore += 200; // Bonificación inmensa por Escoba
        }
        moveScore -= evaluateTableDanger(remainingTable);
      } else {
        // Es un descarte
        moveScore -= evaluateCapture([], move.card); // Pierde el valor de la carta
        const resultingTable = [...tableCards, move.card];
        moveScore -= evaluateTableDanger(resultingTable);
      }

      if (moveScore > bestScore) {
        bestScore = moveScore;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  return possibleMoves[0];
}
