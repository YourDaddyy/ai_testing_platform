import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LogEntry } from "@/components/http-tool/InlineLogsTab";

export interface LogStore {
  logsBySource: Record<string, LogEntry[]>;
  queriedBySource: Record<string, boolean>;
  txIdBySource: Record<string, string>;
  errorMsgBySource: Record<string, string>;
  lastProcessedAutoQueryKeyBySource: Record<string, string>;
  
  setLogs: (source: string, logs: LogEntry[]) => void;
  setQueried: (source: string, queried: boolean) => void;
  setTxId: (source: string, txId: string) => void;
  setErrorMsg: (source: string, errorMsg: string) => void;
  setLastProcessedAutoQueryKey: (source: string, key: string) => void;
  clearAllLogs: () => void;
}

export const useLogStore = create<LogStore>()(
  persist(
    (set) => ({
      logsBySource: {},
      queriedBySource: {},
      txIdBySource: {},
      errorMsgBySource: {},
      lastProcessedAutoQueryKeyBySource: {},
      
      setLogs: (source, logs) =>
        set((state) => ({
          logsBySource: { ...state.logsBySource, [source]: logs },
        })),
      setQueried: (source, queried) =>
        set((state) => ({
          queriedBySource: { ...state.queriedBySource, [source]: queried },
        })),
      setTxId: (source, txId) =>
        set((state) => ({
          txIdBySource: { ...state.txIdBySource, [source]: txId },
        })),
      setErrorMsg: (source, errorMsg) =>
        set((state) => ({
          errorMsgBySource: { ...state.errorMsgBySource, [source]: errorMsg },
        })),
      setLastProcessedAutoQueryKey: (source, key) =>
        set((state) => ({
          lastProcessedAutoQueryKeyBySource: { 
            ...state.lastProcessedAutoQueryKeyBySource, 
            [source]: key 
          },
        })),
      clearAllLogs: () => set({ 
        logsBySource: {}, 
        queriedBySource: {}, 
        txIdBySource: {}, 
        errorMsgBySource: {},
        lastProcessedAutoQueryKeyBySource: {}
      }),
    }),
    {
      name: "crm-log-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
