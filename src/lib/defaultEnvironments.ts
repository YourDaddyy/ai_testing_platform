// Default environments based on authoritative server configurations.
// Log paths, encoding, and grep patterns are defined in serviceLogConfigs.ts — not here.
import { Environment } from "../store/useConfigStore";
import { v4 as uuidv4 } from "uuid";

export const defaultEnvironments: Environment[] = [
  {
    id: "env-test",
    name: "测试",
    hosts: {
      bssp: [
        { label: "BSSP-229", sshHost: "10.47.213.229", sshPort: 22, sshUsername: "bssp", sshPassword: "Bsspbl321!" },
        { label: "BSSP-230", sshHost: "10.47.213.230", sshPort: 22, sshUsername: "bssp", sshPassword: "Bsspbl321!" },
      ],
      sac: [
        { label: "SAC-75", sshHost: "10.44.46.75", sshPort: 22, sshUsername: "sac", sshPassword: "fmbs3_adm!" },
      ],
      cmc: [
        { label: "CMC-245", sshHost: "10.47.213.245", sshPort: 22, sshUsername: "cmc", sshPassword: "fmbs3_adm!" },
      ],
      te: [
        { label: "TE-184", sshHost: "10.47.213.184", sshPort: 22, sshUsername: "bossbm1", sshPassword: "fmbs3_adm!" },
        { label: "TE-55", sshHost: "10.44.46.55", sshPort: 22, sshUsername: "bossbm1", sshPassword: "fmbs3_adm!" },
      ],
      bop: [
        { label: "BOP-33", sshHost: "10.47.202.33", sshPort: 22, sshUsername: "bossweb", sshPassword: "fmbs3_adm!" },
      ],
    },
  },
  {
    id: "env-stage",
    name: "回归",
    hosts: {
      bssp: [
        { label: "BSSP-122", sshHost: "10.47.213.122", sshPort: 22, sshUsername: "bssp", sshPassword: "Bsspbl321!" },
      ],
      sac: [
        { label: "SAC-76", sshHost: "10.44.46.76", sshPort: 22, sshUsername: "sac", sshPassword: "fmbs3_adm!" },
      ],
      cmc: [
        { label: "CMC-224", sshHost: "10.47.202.224", sshPort: 22, sshUsername: "cmc", sshPassword: "fmbs3_adm!" },
      ],
      te: [
        { label: "TE-26", sshHost: "10.47.213.26", sshPort: 22, sshUsername: "bossbm1", sshPassword: "fmbs3_adm!" },
      ],
      bop: [
        { label: "BOP-86", sshHost: "10.45.117.86", sshPort: 22, sshUsername: "bossweb", sshPassword: "fmbs3_adm!" },
      ],
    },
  },
].map((env) => ({
  ...env,
  id: env.id || uuidv4(),
}));
