import React from 'react';

const Card = ({ card, hidden, onClick, selected, isDraggable, onDragStart }) => {
  // Configuración del sprite sheet
  // 12 columnas x 5 filas
  const columns = 12;
  const rows = 5;
  
  let x = 0;
  let y = 0;
  
  if (hidden) {
    // El dorso de la carta está en la fila 5, columna 2 en la imagen (índices 4, 1)
    x = 1;
    y = 4;
  } else if (card) {
    x = card.rankIndex;
    y = card.suitIndex;
  }

  // backgroundPositionX = x * (100 / (columns - 1))
  const posX = (x * 100) / (columns - 1);
  const posY = (y * 100) / (rows - 1);

  const style = {
    backgroundImage: "url('/cards-sprite.png')",
    backgroundSize: "1200% 500%",
    backgroundPosition: `${posX}% ${posY}%`,
  };

  return (
    <div 
      className={`playing-card ${selected ? 'selected' : ''} ${isDraggable ? 'draggable' : ''}`}
      style={style}
      onClick={() => onClick && onClick(card)}
      draggable={isDraggable}
      onDragStart={(e) => onDragStart && onDragStart(e, card)}
    >
      {/* Elemento visual para accesibilidad o si falla la imagen */}
      <span className="sr-only">
        {hidden ? 'Carta oculta' : `${card.rank} de ${card.suit}`}
      </span>
    </div>
  );
};

export default Card;
