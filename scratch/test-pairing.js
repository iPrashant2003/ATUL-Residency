const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--no-first-run',
            '--no-zygote'
        ]
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        console.log('Navigating to WhatsApp Web...');
        await page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle0', timeout: 60000 });
        
        console.log('Waiting for window.Debug to be ready (up to 30s)...');
        let debugReady = false;
        for (let i = 0; i < 60; i++) {
            debugReady = await page.evaluate(() => {
                return typeof window.Debug !== 'undefined' && typeof window.Debug.VERSION !== 'undefined';
            });
            if (debugReady) break;
            await new Promise(r => setTimeout(r, 500));
        }
        
        if (!debugReady) {
            console.error('Timeout waiting for window.Debug');
            return;
        }
        
        console.log('window.Debug is ready! Injecting AuthStore...');
        await page.evaluate(() => {
            window.AuthStore = {};
            window.AuthStore.AppState = window.require('WAWebSocketModel').Socket;
            window.AuthStore.Cmd = window.require('WAWebCmd').Cmd;
            window.AuthStore.Conn = window.require('WAWebConnModel').Conn;
            window.AuthStore.OfflineMessageHandler = window.require('WAWebOfflineHandler').OfflineMessageHandler;
            window.AuthStore.PairingCodeLinkUtils = window.require('WAWebAltDeviceLinkingApi');
            window.AuthStore.Base64Tools = window.require('WABase64');
            window.AuthStore.RegistrationUtils = {
                ...window.require('WAWebCompanionRegClientUtils'),
                ...window.require('WAWebAdvSignatureApi'),
                ...window.require('WAWebUserPrefsInfoStore'),
                ...window.require('WAWebSignalStoreApi'),
            };
        });
        
        console.log('Waiting 5s for page to settle...');
        await new Promise(r => setTimeout(r, 5000));
        
        console.log('Executing pairing code flow...');
        const pairResult = await page.evaluate(async () => {
            try {
                const state = window.require('WAWebSocketModel').Socket.state;
                const typeBefore = window.AuthStore.PairingCodeLinkUtils.getPairingType();
                
                window.AuthStore.PairingCodeLinkUtils.setPairingType('ALT_DEVICE_LINKING');
                const typeAfterSet = window.AuthStore.PairingCodeLinkUtils.getPairingType();
                
                await window.AuthStore.PairingCodeLinkUtils.initializeAltDeviceLinking();
                
                const code = await window.AuthStore.PairingCodeLinkUtils.startAltLinkingFlow('916392651108', true);
                return {
                    success: true,
                    state,
                    typeBefore,
                    typeAfterSet,
                    code
                };
            } catch (err) {
                // Return detailed error structure
                return {
                    success: false,
                    error: err.message || String(err),
                    stack: err.stack,
                    keys: Object.keys(err),
                    stringRepresentation: String(err),
                    json: JSON.stringify(err)
                };
            }
        });
        
        console.log('Pair Result:', JSON.stringify(pairResult, null, 2));
    } catch (e) {
        console.error('Error occurred:', e);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

run();
