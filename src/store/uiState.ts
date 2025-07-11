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
  bringWindowToFront: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
}

export const useUIState = create<UIState>((set, get) => ({
  openWindows: [],
  zIndexOrder: [],
  dockVisible: true,
  spotlightVisible: false,
  
  openWindow: (component, props) => {
    const id = `${component}-${Date.now()}`;
    const currentWindows = get().openWindows;
    const newZIndex = Math.max(...currentWindows.map(w => w.zIndex), 0) + 1;
    
    set(state => ({
      openWindows: [
        ...state.openWindows,
        { id, component, props, zIndex: newZIndex }
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
  
  bringWindowToFront: (id) => {
    const currentWindows = get().openWindows;
    const maxZIndex = Math.max(...currentWindows.map(w => w.zIndex));
    
    set(state => ({
      openWindows: state.openWindows.map(w => 
        w.id === id ? { ...w, zIndex: maxZIndex + 1 } : w
      ),
      zIndexOrder: [
        ...state.zIndexOrder.filter(z => z !== id),
        id
      ]
    }));
  },
  
  minimizeWindow: (id) => {
    // TODO: Implement minimize functionality
    console.log('Minimize window:', id);
  },
  
  maximizeWindow: (id) => {
    // TODO: Implement maximize functionality
    console.log('Maximize window:', id);
  },
})); 