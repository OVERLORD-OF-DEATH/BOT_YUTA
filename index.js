const fs = require('fs')
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const NodeCache = require('node-cache')

const ADMIN_NUM = '243896467916'
const PHONE_NUM = '243896467916'
const PREFIX = '!'

const AUTH_PATH = 'auth_info_baileys'
const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 320 })

// Auto-clean session corrompue
if (fs.existsSync(AUTH_PATH)) {
    console.log('🗑️ Nettoyage ancienne session...')
    fs.rmSync(AUTH_PATH, { recursive: true, force: true })
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'warn' }),
        printQRInTerminal: false,
        auth: state,
        msgRetryCounterCache,
        browser: ['Yuta Bot', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000
    })

    let codeRequested = false

    // Demande code seulement 1 fois
    if (!sock.authState.creds.registered && !codeRequested) {
        codeRequested = true
        await delay(3000)
        console.log(`\n📱 Demande code SMS pour ${PHONE_NUM}...`)
        try {
            const code = await sock.requestPairingCode(PHONE_NUM)
            console.log('═══════════════════════')
            console.log('CODE A 8 CHIFFRES:', code)
            console.log('═══════════════')
            console.log('Va sur WhatsApp > Appareils liés > Lier avec code')
        } catch(e) {
            console.log('Erreur code:', e.message)
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        console.log('Status:', connection)
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            console.log('Déconnecté. Code:', statusCode)
            
            // NE JAMAIS EXIT - Render boucle sinon
            console.log('Reconnexion dans 10s...')
            setTimeout(connectToWhatsApp, 10000)
        } 
        else if (connection === 'open') {
            console.log('✅ Yuta Bot connecté avec succès!')
            codeRequested = false // reset pour future reco
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const sender = msg.key.remoteJid
        if (!body.startsWith(PREFIX)) return
        
        const cmd = body.slice(PREFIX.length).trim().split(/ +/)[0].toLowerCase()
        if(cmd === 'ping') await sock.sendMessage(sender, { text: 'Pong 🏓 Bot en ligne 24/7' })
        if(cmd === 'help') await sock.sendMessage(sender, { text: `*YUTA BOT*\n!ping\n!help\n!tagadm\nAdmin: +${ADMIN_NUM}` })
        if(cmd === 'tagadm') await sock.sendMessage(sender, { text: `@${ADMIN_NUM}`, mentions: [`${ADMIN_NUM}@s.whatsapp.net`] })
    })
}

connectToWhatsApp()

// KEEP ALIVE pour Render Free
setInterval(() => {
    console.log('Bot actif...')
}, 300000) // ping toutes les 5min
