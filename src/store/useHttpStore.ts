import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { HttpMethod, HttpRequest, HttpResponse } from "@/types";

interface HttpState {
  // Request
  url: string;
  method: HttpMethod;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  body: string;
  encoding: "GBK" | "UTF-8";
  requestName: string;
  selectedId: string | undefined;
  
  // Response
  response: HttpResponse | null;
  isLoading: boolean;
  error: string | null;

  // Logs
  autoLogQueryKey: string | undefined;

  // UI State
  leftTab: "body" | "req-headers";
  rightTab: "response" | "resp-headers" | "bssp-log" | "sac-log" | "te-log" | "bop-log";
  history: HttpRequest[];
  showHistory: boolean;

  // Actions
  setUrl: (url: string) => void;
  setMethod: (method: HttpMethod) => void;
  setHeaders: (headers: Array<{ key: string; value: string; enabled: boolean }>) => void;
  setBody: (body: string) => void;
  setEncoding: (encoding: "GBK" | "UTF-8") => void;
  setRequestName: (name: string) => void;
  setSelectedId: (id: string | undefined) => void;
  
  setResponse: (res: HttpResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearResponse: () => void;

  setAutoLogQueryKey: (key: string | undefined) => void;
  setLeftTab: (tab: "body" | "req-headers") => void;
  setRightTab: (tab: "response" | "resp-headers" | "bssp-log" | "sac-log" | "te-log" | "bop-log") => void;
  setHistory: (history: HttpRequest[]) => void;
  setShowHistory: (show: boolean) => void;
}

import { persist, createJSONStorage } from "zustand/middleware";

export const useHttpStore = create<HttpState>()(
  persist(
    (set) => ({
      // Initial state
      url: "http://10.47.213.184:8080/fcgi-bin/BSSP_SFC",
      method: "POST",
      headers: [{ key: "Content-Type", value: "text/xml; charset=GBK", enabled: true }],
      body: `<?xml version="1.0" encoding="GBK"?>\n<Request>\n  <Header>\n    <TRANS_CODE>CS_XX_XXX</TRANS_CODE>\n    <SRC_SYS_CODE>CRM</SRC_SYS_CODE>\n  </Header>\n  <Body>\n  </Body>\n</Request>`,
      encoding: "GBK",
      requestName: "",
      selectedId: undefined,

      response: null,
      isLoading: false,
      error: null,

      autoLogQueryKey: undefined,

      leftTab: "body",
      rightTab: "response",
      history: [],
      showHistory: false,

      // Actions
      setUrl: (url) => set({ url }),
      setMethod: (method) => set({ method }),
      setHeaders: (headers) => set({ headers }),
      setBody: (body) => set({ body }),
      setEncoding: (encoding) => set({ encoding }),
      setRequestName: (requestName) => set({ requestName }),
      setSelectedId: (selectedId) => set({ selectedId }),

      setResponse: (response) => set({ 
        response, 
        error: null,
        isLoading: false
      }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
      clearResponse: () => set({ 
        response: null, error: null 
      }),

      setAutoLogQueryKey: (autoLogQueryKey) => set({ autoLogQueryKey }),
      setLeftTab: (leftTab) => set({ leftTab }),
      setRightTab: (rightTab) => set({ rightTab }),
      setHistory: (history) => set({ history }),
      setShowHistory: (showHistory) => set({ showHistory }),
    }),
    {
      name: "crm-http-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
