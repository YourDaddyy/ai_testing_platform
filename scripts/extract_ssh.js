const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function decryptSecureCRTV2(hexString, passphrase = '') {
  if (!global.hexStringPrinted) {
    console.log("Raw hex string being decrypted:", hexString);
    global.hexStringPrinted = true;
  }
  
  // Determine prefix (e.g. '02:', '03:')
  if (hexString.startsWith('02:') || hexString.startsWith('03:')) {
    hexString = hexString.substring(3);
  }
  
  // Key and IV
  const key = crypto.createHash('sha256').update(passphrase, 'utf8').digest();
  const iv = Buffer.alloc(16, 0);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(false);

  let decrypted = decipher.update(hexString, 'hex');
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  // Parse V2 structure
  // [4 bytes length little-endian] [plain_bytes] [32 bytes sha256 of plain_bytes] [padding]
  const plainLength = decrypted.readUInt32LE(0);
  const plainBytes = decrypted.subarray(4, 4 + plainLength);
  const digest = decrypted.subarray(4 + plainLength, 4 + plainLength + 32);

  const expectedDigest = crypto.createHash('sha256').update(plainBytes).digest();
  if (!digest.equals(expectedDigest)) {
    if (!global.debugDecryptionPrinted) {
      console.warn("Invalid digest debug:");
      console.warn("decrypted length:", decrypted.length);
      console.warn("plainLength:", plainLength);
      console.warn("plainBytes:", plainBytes.toString('hex'));
      console.warn("extracted digest:", digest.toString('hex'));
      console.warn("expected digest:", expectedDigest.toString('hex'));
      global.debugDecryptionPrinted = true;
    }
    return null;
  }

  const pass = plainBytes.toString('utf8');
  if (!global.passPrinted) {
      console.log("SUCCESSFULLY DECRYPTED FIRST PASSWORD:", pass);
      global.passPrinted = true;
  }
  return pass;
}

function parseIni(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');

  const lines = text.split(/\r?\n/);
  const data = {};
  
  for (const line of lines) {
    // some lines might start with BOM or spaces. Let's be generous:
    const match = line.trim().match(/^[A-Z]:"([^"]+)"=(.*)$/);
    if (match) {
      data[match[1]] = match[2];
    }
  }
  
  // Debug print first file
  if (!global.debugPrinted) {
    console.log("Parsed keys for first file:", Object.keys(data).slice(0, 5));
    global.debugPrinted = true;
  }
  return data;
}

function scanSessions(basePath) {
  const results = {};
  
  if (!fs.existsSync(basePath)) return results;

  const envs = fs.readdirSync(basePath);
  for (const envName of envs) {
    const envPath = path.join(basePath, envName);
    if (fs.statSync(envPath).isDirectory()) {
      results[envName] = [];
      const files = fs.readdirSync(envPath).filter(f => f.endsWith('.ini') && f !== '__FolderData__.ini');
      
      for (const file of files) {
        const filePath = path.join(envPath, file);
        const data = parseIni(filePath);
        
        let password = '';
        if (data['Password V2']) {
           password = decryptSecureCRTV2(data['Password V2']);
        }
        
        if (data['Hostname'] && data['Username']) {
          results[envName].push({
            name: file.replace('.ini', ''),
            host: data['Hostname'],
            user: data['Username'],
            password: password || '',
            port: data['[SSH2] Port'] || '22'
          });
        }
      }
    }
  }
  return results;
}

const sessionsPath = path.join('f:', 'Work', 'UniDev', 'Sessions', 'New Folder');
const data = scanSessions(sessionsPath);

// Also scan 个人
const personalPath = path.join('f:', 'Work', 'UniDev', 'Sessions', '个人');
if (fs.existsSync(personalPath)) {
  data['个人'] = [];
  const files = fs.readdirSync(personalPath).filter(f => f.endsWith('.ini') && f !== '__FolderData__.ini');
  for (const file of files) {
    const filePath = path.join(personalPath, file);
    const iniData = parseIni(filePath);
    let password = '';
    if (iniData['Password V2']) password = decryptSecureCRTV2(iniData['Password V2']);
    
    if (iniData['Hostname'] && iniData['Username']) {
      data['个人'].push({
        name: file.replace('.ini', ''),
        host: iniData['Hostname'],
        user: iniData['Username'],
        password: password || '',
        port: iniData['[SSH2] Port'] || '22'
      });
    }
  }
}

fs.writeFileSync('extracted_hosts.json', JSON.stringify(data, null, 2));
console.log("Extraction complete. Found environments:", Object.keys(data).join(', '));
