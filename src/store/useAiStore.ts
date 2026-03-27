import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AiState } from '@/types';

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      analysisText: "",
      status: "idle",
      targetTxId: "",
      rawLogs: [],
      displayLogs: [],
      showHighValueOnly: true,
      setAnalysisText: (update) => set((state) => ({
        analysisText: typeof update === 'function' ? update(state.analysisText) : update
      })),
      setStatus: (status) => set({ status }),
      setTargetTxId: (txId) => set({ targetTxId: txId }),
      setRawLogs: (logs) => set({ rawLogs: logs }),
      setDisplayLogs: (logs) => set({ displayLogs: logs }),
      setShowHighValueOnly: (show) => set({ showHighValueOnly: show }),
      reset: () => set({ analysisText: "", status: "idle", targetTxId: "", rawLogs: [], displayLogs: [] }),
    }),
    {
      name: 'crm-ai-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
