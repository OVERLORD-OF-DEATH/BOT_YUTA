const fs = require('fs')
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const NodeCache = require('node-cache')

const ADMIN_NUM = '243896467916'
const PHONE_NUM = '243896467916'
const PREFIX = '!'

const AUTH_PATH = 'auth_info_baileys'
const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 320 })

// SUPPRIME SESSION CORROMPUE AU DÉMARRAGE
if (fs.existsSync(AUTH_PATH)) {
    console.log('🗑️ Suppression ancienne session...')
    fs.rmSync(AUTH_PATH, { recursive: true, force: true })
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        msgRetryCounterCache,
        browser: ['Yuta Bot', 'Chrome', '1.0.0']
    })

    if (!sock.authState.creds.registered) {
        await delay(5000)
        console.log(`\n📱 Demande code SMS pour ${PHONE_NUM}...`)
        const code = await sock.requestPairingCode(PHONE_NUM)
        console.log('════════')
        console.log('CODE A 8 CHIFFRES:', code)
        console.log('════════')
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const statusCode = (lastDisconnect.error)?.output?.statusCode
            console.log('Connexion fermée. Status:', statusCode)
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('Session expirée. Suppression auto au redémarrage.')
                process.exit(1)
            } else {
                setTimeout(connectToWhatsApp, 5000)
            }
        } else if (connection === 'open') {
            console.log('✅ Yuta Bot connecté!')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const sender = msg.key.remoteJid
        if (!body.startsWith(PREFIX)) return
        const args = body.slice(PREFIX.length).trim().split(/ +/)
        const cmd = args.shift().toLowerCase()

        if(cmd === 'ping') await sock.sendMessage(sender, { text: 'Pong 🏓' })
        if(cmd === 'help') await sock.sendMessage(sender, { text: `*YUTA BOT*\n${PREFIX}ping\n${PREFIX}help\nAdmin: +${ADMIN_NUM}` })
        if(cmd === 'tagadm') await sock.sendMessage(sender, { text: `@${ADMIN_NUM}`, mentions: [`${ADMIN_NUM}@s.whatsapp.net`] })
    })
}

connectToWhatsApp()
