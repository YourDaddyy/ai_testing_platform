import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface HostCredentials {
  label?: string; // e.g. "BM", "CS", "Node-1"
  url?: string;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  sshLogPaths?: string;
  encoding?: string;
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
  // Environments
  environments: Environment[];
  activeEnvId: string | null;

  // AI Configuration
  aiApiKey: string;
  aiModel: string;
  aiBaseUrl: string;

  // Actions
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

import { defaultEnvironments } from "../lib/defaultEnvironments";

// Helper to convert existing single-host defaults into the new array format
const wrapHosts = (hosts: any) => {
  const newHosts: any = {};
  for (const key in hosts) {
    if (hosts[key] && !Array.isArray(hosts[key])) {
      newHosts[key] = [{ ...hosts[key], label: key.toUpperCase() }];
    } else {
      newHosts[key] = hosts[key];
    }
  }
  return newHosts;
};

const DEFAULT_ENV: Environment = {
  id: "default-dev",
  name: "测试 (Default)",
  hosts: {
    bssp: [
      {
        label: "BSSP-229",
        sshHost: "10.47.213.229",
        sshPort: 22,
        sshUsername: "bssp",
        sshPassword: "Bsspbl321!",
        sshLogPaths: "/bosslog1/bssp/log",
        encoding: "gbk",
      },
      {
        label: "BSSP-230",
        sshHost: "10.47.213.230",
        sshPort: 22,
        sshUsername: "bssp",
        sshPassword: "Bsspbl321!",
        sshLogPaths: "/bosslog1/bssp/log",
        encoding: "gbk",
      },
    ],
    sac: [
      {
        label: "SAC-75",
        sshHost: "10.44.46.75",
        sshPort: 22,
        sshUsername: "sac",
        sshPassword: "fmbs3_adm!",
        sshLogPaths: "~",
      },
    ],
    cmc: [
      {
        label: "CMC-245",
        sshHost: "10.47.213.245",
        sshPort: 22,
        sshUsername: "cmc",
        sshPassword: "fmbs3_adm!",
        sshLogPaths: "~",
      },
    ],
    te: [
      {
        label: "TE-184",
        sshHost: "10.47.213.184",
        sshPort: 22,
        sshUsername: "bossbm1",
        sshPassword: "fmbs3_adm!",
        sshLogPaths: "/bosslog1/applog/bm/log",
      },
      {
        label: "TE-55",
        sshHost: "10.44.46.55",
        sshPort: 22,
        sshUsername: "bossbm1",
        sshPassword: "fmbs3_adm!",
        sshLogPaths: "/bosslog1/applog/bm/log",
      },
    ],
    bop: [
      {
        label: "BOP-33",
        url: "http://10.47.202.33",
        sshHost: "10.47.202.33",
        sshPort: 22,
        sshUsername: "bossweb",
        sshPassword: "fmbs3_adm!",
        sshLogPaths: "/bossapp1/TongWeb4.0/bin/boss_record_public.log",
      },
    ],
  },
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      environments: [
        DEFAULT_ENV,
        ...defaultEnvironments.map(env => ({ ...env, hosts: wrapHosts(env.hosts) }))
      ],
      activeEnvId: DEFAULT_ENV.id,

      aiApiKey: "",
      aiModel: "claude-3-5-sonnet-20241022",
      aiBaseUrl: "https://api.anthropic.com/v1/messages",

      addEnvironment: (env) =>
        set((state) => ({ environments: [...state.environments, env] })),

      updateEnvironment: (id, partial) =>
        set((state) => ({
          environments: state.environments.map((e) =>
            e.id === id ? { ...e, ...partial, hosts: { ...e.hosts, ...partial.hosts } } : e
          ),
        })),

      deleteEnvironment: (id) =>
        set((state) => ({
          environments: state.environments.filter((e) => e.id !== id),
          activeEnvId: state.activeEnvId === id ? state.environments[0]?.id || null : state.activeEnvId,
        })),

      setActiveEnvId: (id: string) => set({ activeEnvId: id }),

      setAiApiKey: (key) => set({ aiApiKey: key }),
      setAiModel: (model) => set({ aiModel: model }),
      setAiBaseUrl: (url) => set({ aiBaseUrl: url }),
      resetToDefaults: () => set({
        environments: [
          DEFAULT_ENV,
          ...defaultEnvironments.slice(0, 10).map(env => ({ ...env, hosts: wrapHosts(env.hosts) }))
        ],
        activeEnvId: DEFAULT_ENV.id
      }),
      importEnvironments: (envs) => set({ environments: envs, activeEnvId: envs[0]?.id || DEFAULT_ENV.id }),
    }),
    {
      name: "crm-ai-platform-config",
      storage: createJSONStorage(() => localStorage),
      version: 4, // Bumped to force rescue logic for all users
      migrate: (persistedState: any, version: number) => {
        if (version < 4) {
          // Rescue names and merge authoritative defaults
          if (persistedState.environments) {
            // 1. Convert any single host objects to arrays (old v1 logic)
            persistedState.environments = persistedState.environments.map((env: any) => ({
              ...env,
              hosts: wrapHosts(env.hosts)
            }));

            // 2. Map existing environments to stable IDs if they match by name
            persistedState.environments = persistedState.environments.map((env: any) => {
              if (env.name === "测试" || (typeof env.name === 'string' && env.name.includes("测试"))) {
                return { ...env, id: "env-test" };
              }
              if (env.name === "回归" || (typeof env.name === 'string' && env.name.includes("回归"))) {
                return { ...env, id: "env-stage" };
              }
              return env;
            });

            // 3. Ensure all default environments from code are present
            const defaults = [
              DEFAULT_ENV,
              ...defaultEnvironments.map(env => ({ ...env, hosts: wrapHosts(env.hosts) }))
            ];

            const currentEnvs = [...persistedState.environments];
            for (const d of defaults) {
              const existingIdx = currentEnvs.findIndex((e: any) => e.id === d.id);
              if (existingIdx === -1) {
                currentEnvs.push(d);
              } else {
                // Optionally merge hosts from defaults if the user hasn't modified them?
                // For now, just keep the user's version if ID exists.
              }
            }
            persistedState.environments = currentEnvs;
          } else {
            // If environments list is totally gone, reset to defaults
            persistedState.environments = [
              DEFAULT_ENV,
              ...defaultEnvironments.map(env => ({ ...env, hosts: wrapHosts(env.hosts) }))
            ];
          }
        }
        return persistedState;
      }
    }
  )
);
