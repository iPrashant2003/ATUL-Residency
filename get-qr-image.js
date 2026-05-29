const QRCode = require('qrcode');
const http = require('http');
const path = require('path');

const brainDir = 'C:\\Users\\prash\\.gemini\\antigravity\\brain\\638ac3ac-51cb-481c-947c-13b4b025c591';

http.get('http://localhost:3001/status', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const json = JSON.parse(data);
        
        if (json.bot1 && json.bot1.qr) {
            QRCode.toFile(path.join(brainDir, 'whatsapp_qr_bot1.png'), json.bot1.qr, {
                color: { dark: '#000000', light: '#ffffff' }
            }, function (err) {
                if (err) throw err;
                console.log('QR Code for Bot 1 generated successfully');
            });
        } else {
            console.log("Bot 1 Ready Status: " + (json.bot1 ? json.bot1.isReady : false));
        }

        if (json.bot2 && json.bot2.qr) {
            QRCode.toFile(path.join(brainDir, 'whatsapp_qr_bot2.png'), json.bot2.qr, {
                color: { dark: '#000000', light: '#ffffff' }
            }, function (err) {
                if (err) throw err;
                console.log('QR Code for Bot 2 generated successfully');
            });
        } else {
            console.log("Bot 2 Ready Status: " + (json.bot2 ? json.bot2.isReady : false));
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
