import { create } from 'zustand';

interface AiState {
  analysisText: string;
  status: "idle" | "fetching" | "analyzing" | "done" | "error" | "stopped";
  targetTxId: string;
  displayLogs: any[];
  setAnalysisText: (text: string | ((prev: string) => string)) => void;
  setStatus: (status: AiState['status']) => void;
  setTargetTxId: (txId: string) => void;
  setDisplayLogs: (logs: any[]) => void;
  reset: () => void;
}

export const useAiStore = create<AiState>()((set) => ({
  analysisText: "",
  status: "idle",
  targetTxId: "",
  displayLogs: [],
  setAnalysisText: (update) => set((state) => ({
    analysisText: typeof update === 'function' ? update(state.analysisText) : update
  })),
  setStatus: (status) => set({ status }),
  setTargetTxId: (txId) => set({ targetTxId: txId }),
  setDisplayLogs: (logs) => set({ displayLogs: logs }),
  reset: () => set({ analysisText: "", status: "idle", targetTxId: "", displayLogs: [] }),
}));
