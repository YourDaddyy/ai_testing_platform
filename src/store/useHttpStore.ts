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
  rightTab: "response" | "resp-headers" | "bssp-log" | "sac-log" | "te-log" | "cmc-log";
  history: HttpRequest[];
  showHistory: boolean;
  commonUrls: Array<{ id: string; label: string; url: string }>;

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
  setRightTab: (tab: "response" | "resp-headers" | "bssp-log" | "sac-log" | "te-log" | "cmc-log") => void;
  setHistory: (history: HttpRequest[]) => void;
  setShowHistory: (show: boolean) => void;
  
  addCommonUrl: (label: string, url: string) => void;
  removeCommonUrl: (id: string) => void;
  updateCommonUrl: (id: string, label: string, url: string) => void;
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
      commonUrls: [
        { id: "1", label: "生产环境", url: "http://10.47.213.184:8080/fcgi-bin/BSSP_SFC" },
        { id: "2", label: "测试环境", url: "http://10.47.211.12:8080/fcgi-bin/BSSP_SFC" },
        { id: "3", label: "回归环境", url: "http://10.47.213.184:8081/fcgi-bin/BSSP_SFC" },
      ],

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
      
      addCommonUrl: (label, url) => set((state) => ({
        commonUrls: [...state.commonUrls, { id: Math.random().toString(36).substr(2, 9), label, url }]
      })),
      removeCommonUrl: (id) => set((state) => ({
        commonUrls: state.commonUrls.filter(u => u.id !== id)
      })),
      updateCommonUrl: (id, label, url) => set((state) => ({
        commonUrls: state.commonUrls.map(u => u.id === id ? { ...u, label, url } : u)
      })),
    }),
    {
      name: "crm-http-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
