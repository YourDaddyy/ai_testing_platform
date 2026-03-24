import { create } from "zustand";
import { LogEntry } from "@/components/http-tool/InlineLogsTab";

export const EMPTY_ARRAY: any[] = [];

export interface LogStore {
  logsBySource: Record<string, LogEntry[]>;
  queriedBySource: Record<string, boolean>;
  txIdBySource: Record<string, string>;
  errorMsgBySource: Record<string, string>;
  serverErrorsBySource: Record<string, string[]>;
  lastProcessedAutoQueryKeyBySource: Record<string, string>;
  getLogsBySource: (source: string) => LogEntry[];
  getServerErrorsBySource: (source: string) => string[];
  setLogs: (source: string, logs: LogEntry[], serverErrors?: string[]) => void;
  setQueried: (source: string, queried: boolean) => void;
  setTxId: (source: string, txId: string) => void;
  setErrorMsg: (source: string, errorMsg: string) => void;
  setLastProcessedAutoQueryKey: (source: string, key: string) => void;
  clearAllLogs: () => void;
}

export const useLogStore = create<LogStore>()((set, get) => ({
  logsBySource: {},
  getLogsBySource: (source: string) => (get().logsBySource[source] || EMPTY_ARRAY),
  getServerErrorsBySource: (source: string) => (get().serverErrorsBySource[source] || EMPTY_ARRAY),
  queriedBySource: {},
  txIdBySource: {},
  errorMsgBySource: {},
  serverErrorsBySource: {},
  lastProcessedAutoQueryKeyBySource: {},
  
  setLogs: (source, logs, serverErrors) =>
    set((state) => ({
      logsBySource: { ...state.logsBySource, [source]: logs },
      serverErrorsBySource: { ...state.serverErrorsBySource, [source]: serverErrors || [] },
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
}));
