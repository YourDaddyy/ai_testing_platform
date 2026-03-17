const fs = require('fs');

function decryptV3(encrypted) {
    const magic = "yA36zA48dEhfrvghGRg57h5UlDv3";
    let decoded = "";
    for (let i = 0; i < encrypted.length / 2; i++) {
        const hex = encrypted.substr(i * 2, 2);
        const charCode = parseInt(hex, 16);
        const magicChar = magic.charCodeAt(i % magic.length);
        decoded += String.fromCharCode(charCode ^ magicChar);
    }
    return decoded;
}

// FlashFXP 4/5 uses a slightly different XOR algorithm depending on the version.
// Let's test the simple one first on line 6: "5FBB6FEF52CF51B7DF75EE481E"
console.log("ftp172 pass V3 algo:", decryptV3("5FBB6FEF52CF51B7DF75EE481E"));

// There is another popular algorithm variant:
function decryptV4(encrypted) {
    const magic = "yA36zA48dEhfrvghGRg57h5UlDv3";
    let decoded = "";
    // V4 skips the first char? Or adds it?
    // Often it's XOR'd with a shifting key based on previous chars.
    return "Not implemented yet";
}
