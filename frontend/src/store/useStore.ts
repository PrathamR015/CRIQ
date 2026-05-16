import { create } from 'zustand';
import type { Match } from '../api/client';

interface CriqState {
  matches: Match[];
  selectedMatchId: number | null;
  selectedPlayer: string;
  selectedTeam: string;
  toast: string | null;
  setMatches: (m: Match[]) => void;
  setSelectedMatchId: (id: number | null) => void;
  setSelectedPlayer: (name: string) => void;
  setSelectedTeam: (team: string) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useStore = create<CriqState>((set) => ({
  matches: [],
  selectedMatchId: null,
  selectedPlayer: '',
  selectedTeam: 'RCB',
  toast: null,
  setMatches: (matches) => set({ matches }),
  setSelectedMatchId: (selectedMatchId) => set({ selectedMatchId }),
  setSelectedPlayer: (selectedPlayer) => set({ selectedPlayer }),
  setSelectedTeam: (selectedTeam) => set({ selectedTeam }),
  showToast: (toast) => {
    set({ toast });
    setTimeout(() => set({ toast: null }), 3000);
  },
  clearToast: () => set({ toast: null }),
}));
