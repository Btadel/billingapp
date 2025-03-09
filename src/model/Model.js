import { create } from 'zustand';

export const useModelStore = create((set, get) => ({
  selectedElements: [],
  setSelectedElements: (elements) => set({ selectedElements: elements }),
  hoveredElements: [],
  dragging: false,
  draggingParameters: [],
  startDragging: (params) => set({ dragging: true, draggingParameters: params }),
  stopDragging: () => set({ dragging: false, draggingParameters: [] }),
  gptMessages: [{ role: 'user', content: '' }],
  getLastGptMessage: () => get().gptMessages[get().gptMessages.length - 1],
  history: [],
  loadingElements: [],
  inMultipleSelectionMode: false,
})); 