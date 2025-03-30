// store.js
import { create } from 'zustand';

export const useModelStore = create((set, get) => ({
  // Existing model-related state
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

  // Translation-related state
  storyText: '',
  setStoryText: (text) => set({ storyText: text }),
  translatedText: '',
  setTranslatedText: (text) => set({ translatedText: text }),
  wordMappings: [],
  setWordMappings: (mappings) => set({ wordMappings: mappings }),
  formality: 'informal',
  setFormality: (formality) => set({ formality }),
  isSwitchOn: false,
  toggleSwitch: () => set((state) => ({ isSwitchOn: !state.isSwitchOn })),
  isWordMappingOpen: false,
  toggleWordMapping: () => set((state) => ({ isWordMappingOpen: !state.isWordMappingOpen })),
}));