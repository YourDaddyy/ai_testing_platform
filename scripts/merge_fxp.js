const fs = require('fs');
const path = require('path');

let mergedHosts = {};
try {
  mergedHosts = JSON.parse(fs.readFileSync('extracted_hosts.json', 'utf8'));
} catch (e) {
  console.log("Starting fresh without SecureCRT data");
}

// 2. Parse FlashFXP Sites.dat
const sitesFile = 'f:/Work/UniDev/Sessions/FlashFXP/Sites.dat';
if (fs.existsSync(sitesFile)) {
  const text = fs.readFileSync(sitesFile, 'utf8');
  const sites = text.split(/\[\s*Imported Sites\s+/);
  
  // Skip the first split (file header)
  for (let i = 1; i < sites.length; i++) {
     const block = sites[i];
     const lines = block.split(/\r?\n/);
     const headerLine = lines[0].replace(/\]$/, '').trim(); // e.g. "编译主机  10.46.158.20 nl_dev"
     
     // Extract environment classification (first word)
     const envMatch = headerLine.match(/^(\S+)/);
     // Note: If no classification like "测试环境", we'll put it in "FlashFXP Imports"
     const envCategory = envMatch && envMatch[1].includes("环境") ? envMatch[1] : (envMatch && envMatch[1].match(/主机|个人/) ? envMatch[1] : "FlashFXP导入");
     
     let ip = "";
     let user = "";
     
     for (const line of lines) {
       if (line.startsWith('IP=')) ip = line.split('=')[1].trim();
       if (line.startsWith('user=')) user = line.split('=')[1].trim();
     }
     
     if (ip) {
       if (!mergedHosts[envCategory]) {
         mergedHosts[envCategory] = {};
       }
       // If a session with this IP already exists, we prefer the existing mapping, or we merge.
       const sessionName = headerLine;
       mergedHosts[envCategory][sessionName] = {
         ip,
         user,
         source: 'FlashFXP'
       };
     }
  }
}

fs.writeFileSync('merged_hosts.json', JSON.stringify(mergedHosts, null, 2));
console.log("Successfully merged SecureCRT and FlashFXP hosts into merged_hosts.json");
