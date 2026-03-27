/**
 * @fileoverview Auto-generated merged environment list.
 * @responsibility This file serves ONLY as the initial seed data for host configurations. 
 *                 At runtime, the actual source of truth lives in `config.json` / localStorage 
 *                 via `useConfigStore`. Do NOT use this file for runtime lookups.
 */

export const MERGED_HOSTS: Record<string, any[]> = {
  "Production": [
    { name: "Node-A (10.0.1.10)", host: "10.0.1.10", user: "admin", port: 22, logPaths: ["/var/log/app/service*.log"] },
    { name: "Node-B (10.0.1.11)", host: "10.0.1.11", user: "admin", port: 22, logPaths: ["/var/log/app/service*.log"] },
    { name: "DB-Master (10.0.1.12)", host: "10.0.1.12", user: "dbadmin", port: 22, logPaths: ["/var/log/mysql/*.log"] }
  ],
  "Staging": [
    { name: "Stage-App-1 (192.168.1.100)", host: "192.168.1.100", user: "admin", port: 22, logPaths: ["/var/log/app/service*.log"] },
    { name: "Stage-API-1 (192.168.1.102)", host: "192.168.1.102", user: "admin", port: 22, logPaths: ["/var/log/api/gateway*.log"] }
  ],
  "Development": [
    { name: "Dev-Local (127.0.0.1)", host: "127.0.0.1", user: "dev", port: 22, logPaths: ["/tmp/app.log"] }
  ]
};
