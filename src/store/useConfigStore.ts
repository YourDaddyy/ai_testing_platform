import { create } from "zustand";
import { defaultEnvironments } from "../lib/defaultEnvironments";

export interface ServiceType {
  id: string;           // e.g. "bssp"
  label: string;        // e.g. "BSSP"
  encoding: "gbk" | "utf8";
  grepTemplate: string; // Use "{KEY}" as placeholder for search key
  color?: string;       // Tailwind badge color class
}

// Default service seeds — migrated from serviceLogConfigs.ts
export const DEFAULT_SERVICE_TYPES: ServiceType[] = [
  {
    id: "app",
    label: "AppService",
    encoding: "utf8",
    grepTemplate: `{ find /var/log/app -maxdepth 1 -name "service.log.*$(date +%F)*" 2>/dev/null; find /var/log/app/trace -name "flow*" 2>/dev/null; } | xargs -r grep -aH "{KEY}" | tail -2000`,
    color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
  },
  {
    id: "api",
    label: "API Gateway",
    encoding: "utf8",
    grepTemplate: `find /var/log/api -maxdepth 4 -type f -mtime -3 2>/dev/null | xargs -r grep -aH "{KEY}" | tail -2000`,
    color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700",
  },
  {
    id: "database",
    label: "Database Node",
    encoding: "utf8",
    grepTemplate: "",
    color: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700",
  },
  {
    id: "payment",
    label: "Payment",
    encoding: "utf8",
    grepTemplate: `grep -aH "{KEY}" /opt/tomcat/logs/catalina.out | tail -2000`,
    color: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700",
  },
  {
    id: "cache",
    label: "Cache Cluster",
    encoding: "utf8",
    grepTemplate: `find /var/log/redis -maxdepth 2 -name "redis*" | xargs -r grep -aH "{KEY}" | tail -2000`,
    color: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-700",
  },
  {
    id: "auth",
    label: "Auth Server",
    encoding: "utf8",
    grepTemplate: `find /var/log/auth -maxdepth 2 -name "auth_service*" | xargs -r grep -aH "{KEY}" | tail -2000`,
    color: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700",
  },
  {
    id: "container",
    label: "Container Node",
    encoding: "utf8",
    grepTemplate: "",
    color: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-700",
  },
];

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
    app?: HostCredentials[];
    api?: HostCredentials[];
    database?: HostCredentials[];
    payment?: HostCredentials[];
    cache?: HostCredentials[];
    auth?: HostCredentials[];
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
  
  // Dynamic service type registry
  serviceTypes: ServiceType[];
  
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

  // Service Type CRUD
  addServiceType: (svc: Omit<ServiceType, "id"> & { id: string }) => void;
  updateServiceType: (id: string, partial: Partial<ServiceType>) => void;
  removeServiceType: (id: string) => void;
  
  // Service Scripts
  addServiceScript: (envId: string, script: Omit<ServiceScript, "id">) => void;
  updateServiceScript: (envId: string, scriptId: string, partial: Partial<ServiceScript>) => void;
  deleteServiceScript: (envId: string, scriptId: string) => void;
  
  // HTTP URLs
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
  serviceTypes: DEFAULT_SERVICE_TYPES,
  commonUrls: [
    { id: "1", label: "Production API", url: "https://api.example.com/v1/health" },
    { id: "2", label: "Staging API", url: "https://staging-api.example.com/v1/health" },
    { id: "3", label: "Dev Local", url: "http://127.0.0.1:8080/health" },
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
          // Merge persisted service types with defaults, ensuring defaults are never lost
          serviceTypes: (data.serviceTypes ?? DEFAULT_SERVICE_TYPES).map((st: ServiceType) => {
            // Auto-migrate newly added or empty templates for specific services so users don't have to manually update
            if ((st.id === "sac" || st.id === "cmc") && !st.grepTemplate) {
              const defaultSvc = DEFAULT_SERVICE_TYPES.find(d => d.id === st.id);
              if (defaultSvc) return { ...st, grepTemplate: defaultSvc.grepTemplate };
            }
            return st;
          }),
          commonUrls: data.commonUrls ?? [
            { id: "1", label: "Production API", url: "https://api.example.com/v1/health" },
            { id: "2", label: "Staging API", url: "https://staging-api.example.com/v1/health" },
            { id: "3", label: "Dev Local", url: "http://127.0.0.1:8080/health" },
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
    const { isLoaded, environments, activeEnvId, aiApiKey, aiModel, aiBaseUrl, commonUrls, serviceTypes } = get();
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
          serviceTypes,
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

  // Service Type CRUD
  addServiceType: (svc) => {
    set((state) => ({ serviceTypes: [...state.serviceTypes, svc] }));
    get().saveConfig();
  },

  updateServiceType: (id, partial) => {
    const newId = partial.id && partial.id !== id ? partial.id : null;
    set((state) => ({
      serviceTypes: state.serviceTypes.map((s) => s.id === id ? { ...s, ...partial } : s),
      // If the ID changed, rename the matching hosts key in every environment
      environments: newId
        ? state.environments.map((env) => {
            if (!env.hosts[id]) return env;
            const nodes = env.hosts[id];
            const { [id]: _removed, ...rest } = env.hosts;
            return { ...env, hosts: { ...rest, [newId]: nodes } };
          })
        : state.environments,
    }));
    get().saveConfig();
  },

  removeServiceType: (id) => {
    set((state) => ({ serviceTypes: state.serviceTypes.filter((s) => s.id !== id) }));
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
