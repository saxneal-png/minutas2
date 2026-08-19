export const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export function createDeck() {
  const deck = [];
  for (let suitIndex = 0; suitIndex < SUITS.length; suitIndex++) {
    for (let rankIndex = 0; rankIndex < RANKS.length; rankIndex++) {
      deck.push({
        suit: SUITS[suitIndex],
        suitIndex: suitIndex,
        rank: RANKS[rankIndex],
        rankIndex: rankIndex,
        id: `${SUITS[suitIndex]}-${RANKS[rankIndex]}`
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export function getCardValue(card) {
  if (card.rank <= 7) return card.rank;
  if (card.rank === 10) return 8;
  if (card.rank === 11) return 9;
  if (card.rank === 12) return 10;
  return 0;
}

// Encuentra todas las combinaciones de cartas en la mesa que, junto con la carta jugada, sumen 15
export function getValidCaptures(playedCard, tableCards) {
  const target = 15 - getCardValue(playedCard);
  if (target === 0 && tableCards.length === 0) return []; // Just in case, though max value is 10

  const validCombinations = [];

  // Helper function to find combinations that sum to target
  function findCombinations(startIndex, currentSum, currentCombo) {
    if (currentSum === target) {
      validCombinations.push([...currentCombo]);
      return;
    }
    if (currentSum > target || startIndex >= tableCards.length) {
      return;
    }

    for (let i = startIndex; i < tableCards.length; i++) {
      const card = tableCards[i];
      const val = getCardValue(card);
      currentCombo.push(card);
      findCombinations(i + 1, currentSum + val, currentCombo);
      currentCombo.pop();
    }
  }

  findCombinations(0, 0, []);
  return validCombinations;
}

// Valor para determinar la "Primera" (o setenta)
export function getPrimeraValue(card) {
  switch (card.rank) {
    case 7: return 21;
    case 6: return 18;
    case 1: return 16;
    case 5: return 15;
    case 4: return 14;
    case 3: return 13;
    case 2: return 12;
    case 10: return 10; // Sota
    case 11: return 10; // Caballo
    case 12: return 10; // Rey
    default: return 0;
  }
}

export function calculatePrimera(pile) {
  const bestCards = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
  for (const card of pile) {
    const val = getPrimeraValue(card);
    if (val > bestCards[card.suit]) {
      bestCards[card.suit] = val;
    }
  }
  return bestCards.oros + bestCards.copas + bestCards.espadas + bestCards.bastos;
}

export function calculateScores(playerPile, aiPile, playerEscobas, aiEscobas) {
  let pScore = playerEscobas;
  let aScore = aiEscobas;

  // 1. Mayoría de cartas
  if (playerPile.length > aiPile.length) pScore += 1;
  else if (aiPile.length > playerPile.length) aScore += 1;

  // 2. Mayoría de Oros
  const pOros = playerPile.filter(c => c.suit === 'oros').length;
  const aOros = aiPile.filter(c => c.suit === 'oros').length;
  if (pOros > aOros) pScore += 1;
  else if (aOros > pOros) aScore += 1;

  // 3. Siete de Oros (Guindis)
  const hasSieteOrosP = playerPile.some(c => c.suit === 'oros' && c.rank === 7);
  const hasSieteOrosA = aiPile.some(c => c.suit === 'oros' && c.rank === 7);
  if (hasSieteOrosP) pScore += 1;
  if (hasSieteOrosA) aScore += 1;

  // 4. La Primera
  const pPrimera = calculatePrimera(playerPile);
  const aPrimera = calculatePrimera(aiPile);
  if (pPrimera > aPrimera) pScore += 1;
  else if (aPrimera > pPrimera) aScore += 1;

  return { playerScore: pScore, aiScore: aScore };
}
