import { create } from "zustand";
import { defaultEnvironments } from "../lib/defaultEnvironments";

export interface HostCredentials {
  label?: string;
  url?: string;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
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
    [key: string]: HostCredentials[] | undefined;
  };
}

interface ConfigState {
  environments: Environment[];
  activeEnvId: string | null;
  aiApiKey: string;
  aiModel: string;
  aiBaseUrl: string;
  isLoaded: boolean;

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
}

const getInitialEnvironments = () =>
  defaultEnvironments.map((env) => ({ ...env }));

export const useConfigStore = create<ConfigState>()((set, get) => ({
  environments: getInitialEnvironments(),
  activeEnvId: defaultEnvironments[0].id,
  aiApiKey: "",
  aiModel: "claude-3-5-sonnet-20241022",
  aiBaseUrl: "https://api.anthropic.com/v1/messages",
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
    const { environments, activeEnvId, aiApiKey, aiModel, aiBaseUrl } = get();
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environments, activeEnvId, aiApiKey, aiModel, aiBaseUrl }),
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
}));
