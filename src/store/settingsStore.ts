import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface SettingsState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: (localStorage.getItem('bikepacking-theme') as Theme) || 'dark',
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bikepacking-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    return { theme: next };
  }),
}));
