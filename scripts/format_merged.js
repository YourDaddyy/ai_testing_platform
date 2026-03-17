const fs = require('fs');

// Read existing merged hosts
const merged = JSON.parse(fs.readFileSync('merged_hosts.json', 'utf8'));

// Format to Ts structure
let tsContent = `// Auto-generated merged environment list from SecureCRT and FlashFXP\n\n`;
tsContent += `export const MERGED_HOSTS: Record<string, any[]> = {\n`;

for (const [env, hosts] of Object.entries(merged)) {
  tsContent += `  "${env}": [\n`;
  if (Array.isArray(hosts)) {
     for (const host of hosts) {
       tsContent += `    { name: "${host.name}", host: "${host.host}", user: "${host.user}", port: ${host.port === '00000016' ? 22 : parseInt(host.port || '22')} },\n`;
     }
  } else {
     // Object format
     for (const [key, host] of Object.entries(hosts)) {
       tsContent += `    { name: "${key}", host: "${host.ip}", user: "${host.user || ''}", port: 22 },\n`;
     }
  }
  tsContent += `  ],\n`;
}
tsContent += `};\n`;

fs.writeFileSync('src/lib/mergedHosts.ts', tsContent);
console.log("Wrote merged hosts to src/lib/mergedHosts.ts");
