const localtunnel = require('localtunnel');

(async () => {
    console.log('Starting localtunnel programmatically...');
    try {
        const tunnel = await localtunnel({ port: 3001 });
        console.log('Tunnel established:', tunnel.url);
        console.log('Closing tunnel in 5 seconds...');
        setTimeout(() => {
            tunnel.close();
            console.log('Tunnel closed.');
            process.exit(0);
        }, 5000);
    } catch (err) {
        console.error('Failed to start localtunnel:', err);
        process.exit(1);
    }
})();
