import React, { useEffect } from 'react';

const SelectionBox = ({ selectionBox, setSelectionBox, isDragging, setIsDragging, dragOffset, setDragOffset }) => {
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - selectionBox.x,
      y: e.clientY - selectionBox.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    setSelectionBox((prev) => ({
      ...prev,
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        position: 'absolute',
        left: selectionBox.x,
        top: selectionBox.y,
        width: selectionBox.width,
        height: selectionBox.height,
        border: '2px solid blue',
        pointerEvents: 'none',
      }}
    >
      {/* Control Points */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            backgroundColor: 'white',
            border: '2px solid blue',
            borderRadius: '50%',
            pointerEvents: 'all',
            cursor: 'move',
            left: i % 2 === 0 ? '-4px' : 'calc(100% - 4px)',
            top: i < 2 ? '-4px' : 'calc(100% - 4px)',
          }}
          onMouseDown={handleMouseDown}
        />
      ))}
    </div>
  );
};

export default SelectionBox;