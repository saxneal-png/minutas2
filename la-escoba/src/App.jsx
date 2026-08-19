import React, { useState, useEffect, useCallback } from 'react';
import Card from './components/Card';
import { createDeck, shuffleDeck, getValidCaptures, calculateScores } from './gameLogic';
import { determineAIMove } from './aiLogic';

const MainMenu = ({ onStart }) => {
  const [difficulty, setDifficulty] = useState(2);
  const [targetScore, setTargetScore] = useState(15); // Default to 15, let's use 11 or 21 as options

  return (
    <div className="main-menu">
      <h1>LA ESCOBA</h1>
      <div className="glass-panel p-8 menu-options">
        <div className="menu-group">
          <label>Nivel de Dificultad de la IA</label>
          <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
            <option value={1}>Nivel 1: Novato</option>
            <option value={2}>Nivel 2: Aficionado</option>
            <option value={3}>Nivel 3: Experto</option>
            <option value={4}>Nivel 4: Maestro</option>
          </select>
        </div>
        
        <div className="menu-group" style={{ marginTop: '1rem' }}>
          <label>Puntos para ganar</label>
          <select value={targetScore} onChange={(e) => setTargetScore(Number(e.target.value))}>
            <option value={11}>11 Puntos (Partida Rápida)</option>
            <option value={21}>21 Puntos (Partida Larga)</option>
          </select>
        </div>

        <button className="primary-btn" onClick={() => onStart(difficulty, targetScore)}>
          Empezar Juego
        </button>
      </div>
    </div>
  );
};

const EndRoundModal = ({ roundScores, playerScore, aiScore, targetScore, onNextRound, onNewGame, winner }) => {
  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <h2>{winner ? '¡Fin del Juego!' : 'Fin de la Ronda'}</h2>
        
        {winner && (
          <div className="winner-text">
            {winner === 'PLAYER' ? '¡Has Ganado la Partida!' : 'La IA ha ganado la partida.'}
          </div>
        )}

        <div className="score-grid">
          <div className="score-row score-header">
            <div>Categoría</div>
            <div>Tú</div>
            <div>IA</div>
          </div>
          
          <div className="score-row">
            <div className="score-cell">Escobas</div>
            <div className="score-cell">{roundScores.playerEscobas}</div>
            <div className="score-cell">{roundScores.aiEscobas}</div>
          </div>
          <div className="score-row">
            <div className="score-cell">Mayoría de Cartas</div>
            <div className="score-cell">{roundScores.playerPileLength}</div>
            <div className="score-cell">{roundScores.aiPileLength}</div>
          </div>
          <div className="score-row">
            <div className="score-cell">Mayoría de Oros</div>
            <div className="score-cell">{roundScores.playerOros}</div>
            <div className="score-cell">{roundScores.aiOros}</div>
          </div>
          <div className="score-row">
            <div className="score-cell">Siete de Oros</div>
            <div className="score-cell">{roundScores.playerHasSieteOros ? 'Sí' : 'No'}</div>
            <div className="score-cell">{roundScores.aiHasSieteOros ? 'Sí' : 'No'}</div>
          </div>
          <div className="score-row">
            <div className="score-cell">La Primera</div>
            <div className="score-cell">{roundScores.playerPrimera}</div>
            <div className="score-cell">{roundScores.aiPrimera}</div>
          </div>
          <div className="score-row score-header" style={{ marginTop: '1rem' }}>
            <div>PUNTOS TOTALES</div>
            <div style={{ color: 'var(--accent-color)', fontSize: '2rem' }}>{playerScore}</div>
            <div style={{ color: 'var(--accent-color)', fontSize: '2rem' }}>{aiScore}</div>
          </div>
        </div>

        {!winner ? (
          <button className="primary-btn" onClick={onNextRound}>Siguiente Ronda</button>
        ) : (
          <button className="primary-btn" onClick={onNewGame}>Volver al Menú</button>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState('MENU'); // MENU, PLAYING, ROUND_END, GAME_OVER
  const [difficulty, setDifficulty] = useState(2);
  const [targetScore, setTargetScore] = useState(21);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  // Game variables
  const [deck, setDeck] = useState([]);
  const [table, setTable] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [aiHand, setAiHand] = useState([]);
  const [playerPile, setPlayerPile] = useState([]);
  const [aiPile, setAiPile] = useState([]);
  const [playerEscobas, setPlayerEscobas] = useState(0);
  const [aiEscobas, setAiEscobas] = useState(0);
  const [turn, setTurn] = useState('PLAYER'); // PLAYER, AI
  const [lastCapture, setLastCapture] = useState(null);
  
  const [selectedCard, setSelectedCard] = useState(null); // Para el jugador
  const [message, setMessage] = useState('');
  const [roundScores, setRoundScores] = useState({});
  const [winner, setWinner] = useState(null);

  const startNewGame = (diff, target) => {
    setDifficulty(diff);
    setTargetScore(target);
    setPlayerScore(0);
    setAiScore(0);
    startRound();
  };

  const startRound = () => {
    let newDeck = shuffleDeck(createDeck());
    const newTable = newDeck.splice(0, 4);
    const newPlayerHand = newDeck.splice(0, 3);
    const newAiHand = newDeck.splice(0, 3);

    setDeck(newDeck);
    setTable(newTable);
    setPlayerHand(newPlayerHand);
    setAiHand(newAiHand);
    setPlayerPile([]);
    setAiPile([]);
    setPlayerEscobas(0);
    setAiEscobas(0);
    setTurn('PLAYER'); // El jugador empieza (podría ser aleatorio)
    setLastCapture(null);
    setGameState('PLAYING');
    setMessage('¡Empieza la ronda!');
    setTimeout(() => setMessage(''), 2000);
  };

  const dealCards = () => {
    if (deck.length === 0) {
      endRound();
      return;
    }
    const newDeck = [...deck];
    const newPlayerHand = newDeck.splice(0, 3);
    const newAiHand = newDeck.splice(0, 3);
    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    setAiHand(newAiHand);
    setMessage('Repartiendo cartas...');
    setTimeout(() => setMessage(''), 1500);
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const endRound = () => {
    // Si quedan cartas en la mesa, se las lleva el último en capturar
    let pPile = [...playerPile];
    let aPile = [...aiPile];
    if (table.length > 0) {
      if (lastCapture === 'PLAYER') pPile = [...pPile, ...table];
      else if (lastCapture === 'AI') aPile = [...aPile, ...table];
    }
    setTable([]);

    const scoreResults = calculateScores(pPile, aPile, playerEscobas, aiEscobas);
    
    // Stats for the modal
    const pOros = pPile.filter(c => c.suit === 'oros').length;
    const aOros = aPile.filter(c => c.suit === 'oros').length;
    
    const pPrimera = pPile.reduce((max, c) => {
      // Simplification just for display, actual calc is in gameLogic
      return max;
    }, 0); // We just need to show it, the logic is handled

    import('./gameLogic').then(({ calculatePrimera }) => {
      setRoundScores({
        playerEscobas, aiEscobas,
        playerPileLength: pPile.length, aiPileLength: aPile.length,
        playerOros: pOros, aiOros: aOros,
        playerHasSieteOros: pPile.some(c => c.suit === 'oros' && c.rank === 7),
        aiHasSieteOros: aPile.some(c => c.suit === 'oros' && c.rank === 7),
        playerPrimera: calculatePrimera(pPile),
        aiPrimera: calculatePrimera(aPile)
      });
  
      const newPlayerScore = playerScore + scoreResults.playerScore;
      const newAiScore = aiScore + scoreResults.aiScore;
      
      setPlayerScore(newPlayerScore);
      setAiScore(newAiScore);
  
      if (newPlayerScore >= targetScore || newAiScore >= targetScore) {
        if (newPlayerScore > newAiScore) setWinner('PLAYER');
        else if (newAiScore > newPlayerScore) setWinner('AI');
        else setWinner('EMPATE'); // Mismo puntaje, gana el que llegó antes o empate
        setGameState('GAME_OVER');
      } else {
        setGameState('ROUND_END');
      }
    });
  };

  const handlePlayerMove = (card, targetTableCards = []) => {
    if (turn !== 'PLAYER') return;

    let validCaptures = getValidCaptures(card, table);
    
    if (validCaptures.length > 0) {
      // Por simplicidad en la UI: Si hay múltiples capturas válidas posibles y el jugador soltó la carta
      // tomaremos la primera válida. Una mejora futura sería permitir al jugador seleccionar las cartas de la mesa.
      // Aquí, si targetTableCards está vacío, pero hay capturas, podemos tomar una por defecto.
      let captureToMake = validCaptures[0];
      
      // Si el jugador dropeó sobre una carta específica, buscar si hay una captura válida que incluya esa carta
      if (targetTableCards.length > 0) {
        const preferredCapture = validCaptures.find(cap => cap.some(c => c.id === targetTableCards[0].id));
        if (preferredCapture) captureToMake = preferredCapture;
      }

      // Ejecutar captura
      const newTable = table.filter(c => !captureToMake.some(cc => cc.id === c.id));
      setPlayerPile([...playerPile, card, ...captureToMake]);
      setTable(newTable);
      setLastCapture('PLAYER');
      
      if (newTable.length === 0) {
        setPlayerEscobas(prev => prev + 1);
        showMessage('¡ESCOBA!');
      } else {
        showMessage('Captura exitosa');
      }
    } else {
      // Descarte
      setTable([...table, card]);
    }

    setPlayerHand(playerHand.filter(c => c.id !== card.id));
    setSelectedCard(null);
    setTurn('AI');
  };

  // IA Turn
  useEffect(() => {
    if (gameState === 'PLAYING' && turn === 'AI') {
      if (aiHand.length === 0 && playerHand.length === 0) {
        // Ambas manos vacías, repartir
        setTimeout(() => dealCards(), 1000);
        return;
      }

      // Simulate thinking time
      const timer = setTimeout(() => {
        const move = determineAIMove(aiHand, table, difficulty);
        if (move) {
          if (move.type === 'capture') {
            const newTable = table.filter(c => !move.capture.some(cc => cc.id === c.id));
            setAiPile(prev => [...prev, move.card, ...move.capture]);
            setTable(newTable);
            setLastCapture('AI');
            
            if (newTable.length === 0) {
              setAiEscobas(prev => prev + 1);
              showMessage('¡La IA hace Escoba!');
            }
          } else {
            setTable([...table, move.card]);
          }
          setAiHand(aiHand.filter(c => c.id !== move.card.id));
          setTurn('PLAYER');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
    
    // Check for deal cards if both hands are empty but it's player's turn
    if (gameState === 'PLAYING' && turn === 'PLAYER' && aiHand.length === 0 && playerHand.length === 0) {
      dealCards();
    }
  }, [turn, gameState, aiHand, playerHand, table]);


  // Drag & Drop Handlers
  const handleDragStart = (e, card) => {
    if (turn !== 'PLAYER') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('cardId', card.id);
    setSelectedCard(card);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (selectedCard) {
      handlePlayerMove(selectedCard);
    }
  };

  const handleCardClick = (card) => {
    if (turn !== 'PLAYER') return;
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard(null); // Deselect
    } else {
      setSelectedCard(card);
    }
  };

  const handleBoardClick = () => {
    if (turn === 'PLAYER' && selectedCard) {
      handlePlayerMove(selectedCard);
    }
  };


  if (gameState === 'MENU') {
    return <MainMenu onStart={startNewGame} />;
  }

  return (
    <div className="app-container">
      {/* Mensajes Flotantes */}
      {message && <div className="game-message">{message}</div>}

      {/* Fin de ronda / Juego */}
      {(gameState === 'ROUND_END' || gameState === 'GAME_OVER') && (
        <EndRoundModal 
          roundScores={roundScores}
          playerScore={playerScore}
          aiScore={aiScore}
          targetScore={targetScore}
          onNextRound={startRound}
          onNewGame={() => setGameState('MENU')}
          winner={winner}
        />
      )}

      {/* Top Bar */}
      <div className="glass-panel top-bar" style={{ marginBottom: '1rem' }}>
        <div className="score-badge">
          <span className="label">IA (Nivel {difficulty})</span>
          <span className="value">{aiScore}</span>
        </div>
        <div className="score-badge">
          <span className="label">Cartas Restantes</span>
          <span className="value" style={{color: 'white'}}>{deck.length}</span>
        </div>
        <div className="score-badge">
          <span className="label">Tú</span>
          <span className="value">{playerScore}</span>
        </div>
      </div>

      <div className="game-table">
        {/* IA Hand */}
        <div className="hand-container" style={{ opacity: turn === 'AI' ? 1 : 0.5 }}>
          {aiHand.map((card, idx) => (
            <Card key={`ai-${idx}`} hidden={true} />
          ))}
        </div>

        {/* Board */}
        <div 
          className="board-container"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBoardClick}
        >
          <div className="glass-panel board-area">
            {table.map((card) => (
              <Card key={`table-${card.id}`} card={card} />
            ))}
            {table.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '1.5rem', opacity: 0.5 }}>
                Mesa vacía
              </div>
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div className="hand-container" style={{ opacity: turn === 'PLAYER' ? 1 : 0.5 }}>
          {playerHand.map((card) => (
            <Card 
              key={`player-${card.id}`} 
              card={card} 
              isDraggable={turn === 'PLAYER'}
              onDragStart={handleDragStart}
              onClick={handleCardClick}
              selected={selectedCard && selectedCard.id === card.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
