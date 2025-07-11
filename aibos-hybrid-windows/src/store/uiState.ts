import create from 'zustand';

interface WindowState {
  id: string;
  component: string;
  props?: Record<string, any>;
  zIndex: number;
}

interface UIState {
  openWindows: WindowState[];
  zIndexOrder: string[];
  dockVisible: boolean;
  spotlightVisible: boolean;
  openWindow: (component: string, props?: Record<string, any>) => void;
  closeWindow: (id: string) => void;
  setDockVisible: (visible: boolean) => void;
  setSpotlightVisible: (visible: boolean) => void;
}

export const useUIState = create<UIState>((set, get) => ({
  openWindows: [],
  zIndexOrder: [],
  dockVisible: true,
  spotlightVisible: false,
  openWindow: (component, props) => {
    const id = `${component}-${Date.now()}`;
    set(state => ({
      openWindows: [
        ...state.openWindows,
        { id, component, props, zIndex: state.openWindows.length + 1 }
      ],
      zIndexOrder: [...state.zIndexOrder, id],
    }));
  },
  closeWindow: (id) => {
    set(state => ({
      openWindows: state.openWindows.filter(w => w.id !== id),
      zIndexOrder: state.zIndexOrder.filter(z => z !== id),
    }));
  },
  setDockVisible: (visible) => set({ dockVisible: visible }),
  setSpotlightVisible: (visible) => set({ spotlightVisible: visible }),
})); 