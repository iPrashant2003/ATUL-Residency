const fs = require('fs');
const http = require('http');

http.get('http://localhost:3001/status', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const json = JSON.parse(data);
        if (json.qr) {
            console.log("QR_DATA:" + json.qr);
        } else {
            console.log("READY:" + json.isReady);
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
