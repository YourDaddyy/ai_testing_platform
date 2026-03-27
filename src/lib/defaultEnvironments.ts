// Default environments based on authoritative server configurations.
// Log paths, encoding, and grep patterns are defined in useConfigStore.ts.
import { Environment } from "../store/useConfigStore";
import { v4 as uuidv4 } from "uuid";

export const defaultEnvironments: Environment[] = [
  {
    id: "env-test",
    name: "Staging",
    hosts: {
      app: [
        { label: "App-Node-1", sshHost: "192.168.1.100", sshPort: 22, sshUsername: "admin", sshPassword: "password123!" },
        { label: "App-Node-2", sshHost: "192.168.1.101", sshPort: 22, sshUsername: "admin", sshPassword: "password123!" },
      ],
      api: [
        { label: "API-GW-1", sshHost: "192.168.1.102", sshPort: 22, sshUsername: "admin", sshPassword: "password123!" },
      ],
      database: [
        { label: "DB-Primary", sshHost: "192.168.1.103", sshPort: 22, sshUsername: "dbadmin", sshPassword: "password123!" },
      ],
      payment: [
        { label: "Payment-1", sshHost: "192.168.1.104", sshPort: 22, sshUsername: "payadmin", sshPassword: "password123!" },
      ],
    },
  },
  {
    id: "env-prod",
    name: "Production",
    hosts: {
      app: [
        { label: "Prod-App-1", sshHost: "10.0.1.10", sshPort: 22, sshUsername: "admin", sshPassword: "password123!" },
      ],
      api: [
        { label: "Prod-API-1", sshHost: "10.0.1.11", sshPort: 22, sshUsername: "admin", sshPassword: "password123!" },
      ],
      database: [
        { label: "Prod-DB-1", sshHost: "10.0.1.12", sshPort: 22, sshUsername: "dbadmin", sshPassword: "password123!" },
      ],
    },
  },
].map((env) => ({
  ...env,
  id: env.id || uuidv4(),
}));
