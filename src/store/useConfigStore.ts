import { create } from "zustand";
import { defaultEnvironments } from "../lib/defaultEnvironments";

export interface HostCredentials {
  label?: string;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  logPaths?: string[];
}

export interface ServiceScript {
  id: string;
  label: string;
  path: string;
  description?: string;
  defaultParams?: string[];
  serviceType?: string; // e.g. 'bssp', 'te', or 'general'
}

export interface Environment {
  id: string;
  name: string;
  hosts: {
    bssp?: HostCredentials[];
    sac?: HostCredentials[];
    cmc?: HostCredentials[];
    te?: HostCredentials[];
    bop?: HostCredentials[];
    cs?: HostCredentials[];
    [key: string]: HostCredentials[] | undefined;
  };
  scripts?: ServiceScript[];
}

interface ConfigState {
  environments: Environment[];
  activeEnvId: string | null;
  aiApiKey: string;
  aiModel: string;
  aiBaseUrl: string;
  isLoaded: boolean;
  
  // Remote Control Page Persistence
  remoteControlState: {
    lastEnvId: string | null;
    lastServiceGroup: string | null;
    lastScriptId: string | null;
    lastParams: string[];
  };

  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  addEnvironment: (env: Environment) => void;
  updateEnvironment: (id: string, partial: Partial<Environment>) => void;
  deleteEnvironment: (id: string) => void;
  setActiveEnvId: (id: string) => void;
  setAiApiKey: (key: string) => void;
  setAiModel: (model: string) => void;
  setAiBaseUrl: (url: string) => void;
  resetToDefaults: () => void;
  importEnvironments: (envs: Environment[]) => void;
  deleteServiceKey: (envId: string, key: string) => void;
  renameServiceKey: (envId: string, oldKey: string, newKey: string) => void;
  
  // New actions for Service Scripts
  addServiceScript: (envId: string, script: Omit<ServiceScript, "id">) => void;
  updateServiceScript: (envId: string, scriptId: string, partial: Partial<ServiceScript>) => void;
  deleteServiceScript: (envId: string, scriptId: string) => void;
  
  // New actions for HTTP URLs
  commonUrls: Array<{ id: string; label: string; url: string }>;
  addCommonUrl: (label: string, url: string) => void;
  removeCommonUrl: (id: string) => void;
  updateCommonUrl: (id: string, label: string, url: string) => void;

  setRemoteControlState: (state: Partial<ConfigState["remoteControlState"]>) => void;
}

const getInitialEnvironments = () =>
  defaultEnvironments.map((env) => ({ ...env }));

export const useConfigStore = create<ConfigState>()((set, get) => ({
  environments: getInitialEnvironments(),
  activeEnvId: defaultEnvironments[0].id,
  aiApiKey: "",
  aiModel: "claude-3-5-sonnet-20241022",
  aiBaseUrl: "https://api.anthropic.com/v1/messages",
  commonUrls: [
    { id: "1", label: "生产环境", url: "http://10.47.213.184:8080/fcgi-bin/BSSP_SFC" },
    { id: "2", label: "测试环境", url: "http://10.47.211.12:8080/fcgi-bin/BSSP_SFC" },
    { id: "3", label: "回归环境", url: "http://10.47.213.184:8081/fcgi-bin/BSSP_SFC" },
  ],
  remoteControlState: {
    lastEnvId: null,
    lastServiceGroup: null,
    lastScriptId: null,
    lastParams: [],
  },
  isLoaded: false,

  loadConfig: async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data) {
        set({
          environments: data.environments ?? getInitialEnvironments(),
          activeEnvId: data.activeEnvId ?? defaultEnvironments[0].id,
          aiApiKey: data.aiApiKey ?? "",
          aiModel: data.aiModel ?? "claude-3-5-sonnet-20241022",
          aiBaseUrl: data.aiBaseUrl ?? "https://api.anthropic.com/v1/messages",
          commonUrls: data.commonUrls ?? [
            { id: "1", label: "生产环境", url: "http://10.47.213.184:8080/fcgi-bin/BSSP_SFC" },
            { id: "2", label: "测试环境", url: "http://10.47.211.12:8080/fcgi-bin/BSSP_SFC" },
            { id: "3", label: "回归环境", url: "http://10.47.213.184:8081/fcgi-bin/BSSP_SFC" },
          ],
          remoteControlState: data.remoteControlState ?? {
            lastEnvId: null,
            lastServiceGroup: null,
            lastScriptId: null,
            lastParams: [],
          },
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  saveConfig: async () => {
    const { isLoaded, environments, activeEnvId, aiApiKey, aiModel, aiBaseUrl, commonUrls } = get();
    // Safety guard: Don't save if the store hasn't finished loading yet (prevents accidental wipes)
    if (!isLoaded) return;
    
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          environments, 
          activeEnvId, 
          aiApiKey, 
          aiModel, 
          aiBaseUrl, 
          commonUrls,
          remoteControlState: get().remoteControlState
        }),
      });
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  },

  addEnvironment: (env) => {
    set((state) => ({ environments: [...state.environments, env] }));
    get().saveConfig();
  },

  updateEnvironment: (id, partial) => {
    set((state) => ({
      environments: state.environments.map((e) =>
        e.id === id ? { ...e, ...partial, hosts: { ...e.hosts, ...partial.hosts } } : e
      ),
    }));
    get().saveConfig();
  },

  deleteEnvironment: (id) => {
    set((state) => ({
      environments: state.environments.filter((e) => e.id !== id),
      activeEnvId:
        state.activeEnvId === id ? state.environments[0]?.id || null : state.activeEnvId,
    }));
    get().saveConfig();
  },

  setActiveEnvId: (id) => {
    set({ activeEnvId: id });
    get().saveConfig();
  },

  setAiApiKey: (key) => {
    set({ aiApiKey: key });
    get().saveConfig();
  },

  setAiModel: (model) => {
    set({ aiModel: model });
    get().saveConfig();
  },

  setAiBaseUrl: (url) => {
    set({ aiBaseUrl: url });
    get().saveConfig();
  },

  resetToDefaults: () => {
    set({
      environments: getInitialEnvironments(),
      activeEnvId: defaultEnvironments[0].id,
    });
    get().saveConfig();
  },

  importEnvironments: (envs) => {
    set({ environments: envs, activeEnvId: envs[0]?.id || defaultEnvironments[0].id });
    get().saveConfig();
  },

  deleteServiceKey: (envId, key) => {
    set((state) => ({
      environments: state.environments.map((e) => {
        if (e.id !== envId) return e;
        const { [key]: _removed, ...rest } = e.hosts;
        return { ...e, hosts: rest };
      }),
    }));
    get().saveConfig();
  },

  renameServiceKey: (envId, oldKey, newKey) => {
    set((state) => ({
      environments: state.environments.map((e) => {
        if (e.id !== envId) return e;
        const nodes = e.hosts[oldKey] || [];
        const { [oldKey]: _removed, ...rest } = e.hosts;
        return { ...e, hosts: { ...rest, [newKey]: nodes } };
      }),
    }));
    get().saveConfig();
  },

  addCommonUrl: (label, url) => {
    set((state) => ({
      commonUrls: [...state.commonUrls, { id: Math.random().toString(36).substr(2, 9), label, url }]
    }));
    get().saveConfig();
  },

  removeCommonUrl: (id) => {
    set((state) => ({
      commonUrls: state.commonUrls.filter(u => u.id !== id)
    }));
    get().saveConfig();
  },

  updateCommonUrl: (id, label, url) => {
    set((state) => ({
      commonUrls: state.commonUrls.map(u => u.id === id ? { ...u, label, url } : u)
    }));
    get().saveConfig();
  },

  addServiceScript: (envId, script) => {
    set((state) => ({
      environments: state.environments.map((e) =>
        e.id === envId
          ? {
              ...e,
              scripts: [
                ...(e.scripts || []),
                { ...script, id: Math.random().toString(36).substr(2, 9) },
              ],
            }
          : e
      ),
    }));
    get().saveConfig();
  },

  updateServiceScript: (envId, scriptId, partial) => {
    set((state) => ({
      environments: state.environments.map((e) =>
        e.id === envId
          ? {
              ...e,
              scripts: (e.scripts || []).map((s) =>
                s.id === scriptId ? { ...s, ...partial } : s
              ),
            }
          : e
      ),
    }));
    get().saveConfig();
  },

  deleteServiceScript: (envId, scriptId) => {
    set((state) => ({
      environments: state.environments.map((e) =>
        e.id === envId
          ? {
              ...e,
              scripts: (e.scripts || []).filter((s) => s.id !== scriptId),
            }
          : e
      ),
    }));
    get().saveConfig();
  },

  setRemoteControlState: (partial) => {
    set((state) => ({
      remoteControlState: { ...state.remoteControlState, ...partial }
    }));
    get().saveConfig();
  },
}));
