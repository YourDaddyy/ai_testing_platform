import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AiState {
  analysisText: string;
  status: "idle" | "fetching" | "fetching_logs" | "analyzing" | "done" | "error" | "stopped";
  targetTxId: string;
  rawLogs: any[];
  displayLogs: any[];
  showHighValueOnly: boolean;
  setAnalysisText: (text: string | ((prev: string) => string)) => void;
  setStatus: (status: AiState['status']) => void;
  setTargetTxId: (txId: string) => void;
  setRawLogs: (logs: any[]) => void;
  setDisplayLogs: (logs: any[]) => void;
  setShowHighValueOnly: (show: boolean) => void;
  reset: () => void;
}

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
