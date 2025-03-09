import React, { useEffect, useRef } from 'react';
import { useModelStore } from '../model/Model';

const usePreviousEffect = (fn, inputs = []) => {
  const previousInputsRef = useRef([...inputs]);
  useEffect(() => {
    const res = fn(previousInputsRef.current);
    previousInputsRef.current = [...inputs];
    return res;
  }, inputs);
};

const DragnDrop = () => {
  const dragging = useModelStore((state) => state.dragging);
  const draggingParameters = useModelStore((state) => state.draggingParameters);
  const stopDragging = useModelStore((state) => state.stopDragging);

  const getDraggedElement = (draggingParameters, createIfNotExist = true) => {
    let element = document.getElementById(draggingParameters.elementId);
    if (draggingParameters.cloned) {
      let clonedElement = document.getElementById(draggingParameters.elementId + '-clone');
      if (!clonedElement && element && createIfNotExist) {
        clonedElement = element.cloneNode(true);
        clonedElement.setAttribute('id', draggingParameters.elementId + '-clone');
        document.body.appendChild(clonedElement);
      }
      element = clonedElement;
    }
    return element;
  };

  const setElementPos = (draggingParameters, x, y, reset) => {
    const element = getDraggedElement(draggingParameters, !reset);
    if (element) {
      if (reset && draggingParameters.cloned) {
        element.parentElement?.removeChild(element);
      }
      element.style.zIndex = reset ? '' : '1000';
      element.style.pointerEvents = reset ? '' : 'none';
      element.style.opacity = reset ? '' : '0.8';
      element.style.position = reset ? '' : 'absolute';
      element.style.left = reset ? '' : x + 'px';
      element.style.top = reset ? '' : y + 'px';
    }
  };

  usePreviousEffect(([prevDragging, prevDraggingParameters]) => {
    const onMouseUp = (e) => {
      if (dragging) {
        for (const draggingParameter of draggingParameters) {
          setElementPos(draggingParameter, e.clientX - draggingParameter.offsetX, e.clientY - draggingParameter.offsetY, true);
        }
        stopDragging();
      }
    };

    const onMouseMove = (e) => {
      if (dragging) {
        if (e.buttons === 0) {
          onMouseUp(e);
        } else {
          for (const draggingParameter of draggingParameters) {
            setElementPos(draggingParameter, e.clientX - draggingParameter.offsetX, e.clientY - draggingParameter.offsetY, false);
          }
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('dragover', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('dragend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('dragover', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('dragend', onMouseUp);
    };
  }, [dragging, draggingParameters]);

  return <></>;
};

export default DragnDrop;