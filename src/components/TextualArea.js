import React, { useEffect, useRef, useState } from 'react';
import { useModelStore } from '../model/Model';
import OverlappingMarkup from './OverlappingMarkup';

/* ---- Save / Restore caret position ---- */
function saveCaretOffset(rootElement) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (!rootElement.contains(range.commonAncestorContainer)) return null;

  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(rootElement);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
}

function restoreCaretOffset(rootElement, offset) {
  if (offset == null) return;
  const totalLength = rootElement.textContent.length;
  if (totalLength === 0) return;
  if (offset > totalLength) offset = totalLength;

  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();

  const range = document.createRange();
  range.selectNodeContents(rootElement);
  range.collapse(true);

  const walker = document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let currentOffset = 0;
  let node;
  while ((node = walker.nextNode())) {
    const nodeLength = node.nodeValue.length;
    const nextOffset = currentOffset + nodeLength;
    if (offset <= nextOffset) {
      const offsetInNode = offset - currentOffset;
      range.setStart(node, offsetInNode);
      range.collapse(true);
      break;
    }
    currentOffset = nextOffset;
  }
  selection.addRange(range);
}

/* ---- Draggable Highlight Component ---- */
const SelectedText = ({
  children,
  id,
  style,
  className,
  onDropDistanceUpdate,
  dropDistance, // receives { dx, dy }
}) => {
  const selectedElements = useModelStore((state) => state.selectedElements);
  const startDragging = useModelStore((state) => state.startDragging);
  const dragging = useModelStore((state) => state.dragging);
  const [isClicked, setIsClicked] = useState(false);
  const dragStartRef = useRef(null);

  // Compute background color from yellow (#ffff00) to red (#ff0000) based on drag distance
  const computeBackgroundColor = (distance) => {
    const { dx = 0, dy = 0 } = distance || {};
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = 200;
    const ratio = Math.min(dist / threshold, 1);
    const green = Math.round(255 * (1 - ratio));
    const greenHex = green.toString(16).padStart(2, '0');
    return `#ff${greenHex}00`;
  };

  const backgroundColor = computeBackgroundColor(dropDistance);

  // Debugging render
  useEffect(() => {
    console.log('SelectedText render, id:', id, 'dropDistance:', dropDistance, 'bgColor:', backgroundColor);
  }, [dropDistance, id, backgroundColor]);

  return (
    <span
      className={className}
      id={id}
      style={{
        borderRadius: 2,
        cursor: 'pointer',
        backgroundColor,
        ...style,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        if (e.button === 0) {
          setIsClicked(true);
          dragStartRef.current = { x: e.clientX, y: e.clientY };
          console.log('Mouse down, starting drag at:', dragStartRef.current);
        }
      }}
      onMouseUp={(e) => {
        if (e.button === 0 && dragStartRef.current) {
          const dx = e.clientX - dragStartRef.current.x;
          const dy = e.clientY - dragStartRef.current.y;
          if (typeof onDropDistanceUpdate === 'function') {
            onDropDistanceUpdate({ dx, dy });
          }
          dragStartRef.current = null;
          setIsClicked(false);
          console.log('Mouse up, final dropDistance:', { dx, dy });
        }
      }}
      onMouseMove={(e) => {
        if (isClicked && dragStartRef.current) {
          const dx = e.clientX - dragStartRef.current.x;
          const dy = e.clientY - dragStartRef.current.y;
          if (typeof onDropDistanceUpdate === 'function') {
            onDropDistanceUpdate({ dx, dy });
          }
        }
        if (isClicked && !dragging && e.buttons === 1) {
          const draggingParameters = selectedElements
            .map((element, i) => {
              const span = document.getElementById('selection' + i);
              if (span) {
                const rect = span.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                return {
                  elementId: span.id,
                  initialX: e.clientX,
                  initialY: e.clientY,
                  cloned: true,
                  offsetX,
                  offsetY,
                  entities: [element],
                };
              }
              return null;
            })
            .filter(Boolean);

          if (draggingParameters.length > 0) {
            startDragging(draggingParameters);
          }
        }
      }}
    >
      {children}
    </span>
  );
};

/* ---- Main TextualArea Component ---- */
const TextualArea = ({ text, onChange, placeholder, style, language }) => {
  const selectedElements = useModelStore((state) => state.selectedElements) || [];
  const setSelectedElements = useModelStore((state) => state.setSelectedElements);
  const inMultipleSelectionMode = useModelStore((state) => state.inMultipleSelectionMode);

  const editableRef = useRef(null);
  const caretOffsetRef = useRef(null);
  const [showPlaceholder, setShowPlaceholder] = useState(!text);
  const [dropDistance, setDropDistance] = useState({ dx: 0, dy: 0 });

  /* ---- Build annotations for OverlappingMarkup ---- */
  const annotations = selectedElements.map((element, i) => ({
    min: element.customData.startIndex,
    max: element.customData.endIndex,
    style: {
      content: ({ children }) => (
        <SelectedText
          id={'selection' + i}
          style={{ paddingTop: 2.5, paddingBottom: 2.5 }}
          className="selectedText"
          onDropDistanceUpdate={setDropDistance}
          dropDistance={dropDistance}
        >
          {children}
        </SelectedText>
      ),
    },
    data: { element, index: i, isLoading: false },
  }));

  /* ---- MouseUp handler: record or clear selection ---- */
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';

      if (!selectedText) {
        if (selectedElements.length > 0) {
          setSelectedElements([]);
        }
        return;
      }

      if (!editableRef.current.contains(selection.anchorNode)) {
        setSelectedElements([]);
        return;
      }

      const range = selection.getRangeAt(0);
      const startIndex = Math.min(range.startOffset, range.endOffset);
      const endIndex = Math.max(range.startOffset, range.endOffset);
      const newAnnotationText = text.substring(startIndex, endIndex);

      if (!newAnnotationText) {
        setSelectedElements([]);
        return;
      }

      let newElements = inMultipleSelectionMode ? [...selectedElements] : [];
      const exists = newElements.find(
        (el) =>
          el.customData.startIndex === startIndex &&
          el.customData.endIndex === endIndex
      );
      if (!exists) {
        newElements.push({
          customData: { startIndex, endIndex, text: newAnnotationText },
          htmlRepresentation: <>{newAnnotationText}</>,
          textRepresentation: newAnnotationText,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        });
      }
      setSelectedElements(newElements);
      selection.removeAllRanges();

      if (editableRef.current) {
        editableRef.current.focus();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [text, selectedElements, setSelectedElements, inMultipleSelectionMode]);

  /* ---- Input handler: update text & caret position ---- */
  const handleInput = (e) => {
    caretOffsetRef.current = saveCaretOffset(editableRef.current);
    const newText = e.target.textContent || '';
    setShowPlaceholder(!newText);
    onChange(newText);
  };

  /* ---- Restore caret after each re-render ---- */
  useEffect(() => {
    if (!showPlaceholder && editableRef.current) {
      restoreCaretOffset(editableRef.current, caretOffsetRef.current);
    }
  }, [text, showPlaceholder]);

  /* ---- Debug dropDistance changes ---- */
  useEffect(() => {
    console.log('TextualArea dropDistance:', dropDistance);
  }, [dropDistance]);

  return (
    <div style={{ display: 'flex', justifyContent: 'left', width: '100%' }}>
      <div
        ref={editableRef}
        id="selectableText"
        className="trans-textarea"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dir="ltr"
        style={{
          textAlign: 'left',
          direction: 'ltr',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5rem',
          minHeight: '200px',
          width: '100%',
          maxWidth: 600,
          margin: 0,
          padding: '8px',
          border: '1px solid #ccc',
          overflow: 'auto',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        {showPlaceholder ? (
          <span key="placeholder" style={{ color: '#aaa' }}>
            {placeholder}
          </span>
        ) : (
          <OverlappingMarkup
            key={`text-${dropDistance.dx}-${dropDistance.dy}`}
            text={text}
            styling={annotations}
          />
        )}
      </div>
    </div>
  );
};

export default TextualArea;