const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('extracted_hosts.json', 'utf8'));

const environments = [];

Object.keys(data).forEach((envName, index) => {
  const hosts = data[envName];
  if (!hosts || hosts.length === 0) return;

  const bsspHost = hosts.find(h => h.name.toLowerCase().includes('bssp') || h.user.toLowerCase() === 'bssp');
  const sacHost = hosts.find(h => h.name.toLowerCase().includes('sac') || h.user.toLowerCase() === 'sac');
  const teHost = hosts.find(h => h.name.toLowerCase().includes('te') || h.user.toLowerCase() === 'te');

  const env = {
    id: `env-${index}-${Date.now()}`,
    name: envName,
    hosts: {}
  };

  if (bsspHost) {
    env.hosts.bssp = {
      url: `http://${bsspHost.host}:8080`,
      sshHost: bsspHost.host,
      sshPort: parseInt(bsspHost.port, 10) || 22,
      sshUsername: bsspHost.user,
      sshPassword: bsspHost.password || '',
      sshLogPaths: '/data/bssp/bssplog' // Random sensible default
    };
  }

  if (sacHost) {
    env.hosts.sac = {
      url: `http://${sacHost.host}:8080`,
      sshHost: sacHost.host,
      sshPort: parseInt(sacHost.port, 10) || 22,
      sshUsername: sacHost.user,
      sshPassword: sacHost.password || '',
      sshLogPaths: '/data/sac/log' 
    };
  }

  if (teHost) {
    env.hosts.te = {
      url: `http://${teHost.host}:8089`,
      sshHost: teHost.host,
      sshPort: parseInt(teHost.port, 10) || 22,
      sshUsername: teHost.user,
      sshPassword: teHost.password || '',
      sshLogPaths: '/applog/bm/log'
    };
  }

  environments.push(env);
});

// Since the user might have some manual edits they want to keep, we'll export an array.
const tsOutput = `// This file is auto-generated based on SecureCRT session extraction.
import { Environment } from "../store/useConfigStore";
import { v4 as uuidv4 } from "uuid";

export const defaultEnvironments: Environment[] = ${JSON.stringify(environments, null, 2)}.map(env => ({
  ...env,
  id: uuidv4() // Generate fresh IDs
}));
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'defaultEnvironments.ts'), tsOutput);
console.log("Successfully generated defaultEnvironments.ts mapped from SecureCRT configs.");
