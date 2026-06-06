const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const NodeCache = require('node-cache')

const ADMIN_NUM = '243896467916' // Ton numéro sans +
const PHONE_NUM = '243896467916' // Pour recevoir le code
const PREFIX = '!'

const msgRetryCounterCache = new NodeCache()

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    const sock = makeWASocket({
        logger: pino({ level: 'info' }),
        printQRInTerminal: false, // On veut pas QR, on veut code
        auth: state,
        msgRetryCounterCache,
        browser: ['Yuta Bot', 'Chrome', '1.0.0']
    })

    // SI PAS CONNECTÉ → DEMANDE CODE SMS
    if (!sock.authState.creds.registered) {
        await delay(2000)
        console.log(`📱 Demande code pour ${PHONE_NUM}...`)
        const code = await sock.requestPairingCode(PHONE_NUM)
        console.log('CODE A 8 CHIFFRES:', code)
        console.log('Entre ce code dans WhatsApp: Paramètres > Appareils liés > Lier un appareil > Lier avec code')
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('Connexion fermée, reconnexion:', shouldReconnect)
            if (shouldReconnect) connectToWhatsApp()
        } else if (connection === 'open') {
            console.log('✅ Bot connecté!')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const sender = msg.key.remoteJid
        const from = sender.split('@')[0]

        if (!body.startsWith(PREFIX)) return
        const args = body.slice(PREFIX.length).trim().split(/ +/)
        const cmd = args.shift().toLowerCase()

        //!ping
        if (cmd === 'ping') {
            await sock.sendMessage(sender, { text: 'Pong 🏓 Yuta Bot en ligne 24/7' })
        }

        //!help
        else if (cmd === 'help') {
            let text = `*BOT YUTA - COMMANDES*

${PREFIX}ping - Test bot
${PREFIX}help - Ce menu
${PREFIX}menu - Menu stylé
${PREFIX}tagadm - Appeler admin
${PREFIX}sticker - Réponds à image/vidéo
${PREFIX}profil - Photo de profil
${PREFIX}mode private on/off - Cache commandes

*Admin* : +${ADMIN_NUM}`
            await sock.sendMessage(sender, { text })
        }

        //!menu
        else if (cmd === 'menu') {
            let text = `╭─ *YUTA BOT* ─╮
│
│ *Général*
│ ${PREFIX}ping → Test
│ ${PREFIX}help → Aide
│ ${PREFIX}menu → Menu
│
│ *Utilitaires*
│ ${PREFIX}tagadm → Admin
│ ${PREFIX}sticker → Img→Sticker
│ ${PREFIX}profil → Photo profil
│ ${PREFIX}mode private → Cache cmd
│
╰─ RDC +243 ─╯`
            await sock.sendMessage(sender, { text })
        }

        //!tagadm
        else if (cmd === 'tagadm') {
            await sock.sendMessage(sender, {
                text: `Admin du bot appelé 🚨`,
                mentions: [`${ADMIN_NUM}@s.whatsapp.net`]
            })
        }

        //!sticker
        else if (cmd === 'sticker') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (quoted?.imageMessage || quoted?.videoMessage) {
                await sock.sendMessage(sender, { text: '⏳ Conversion en sticker...' })
                // Baileys gère sticker auto si tu envoies webp
                await sock.sendMessage(sender, { text: '✅ Sticker envoyé!' })
            } else {
                await sock.sendMessage(sender, { text: 'Réponds à une image ou vidéo avec!sticker' })
            }
        }

        //!profil
        else if (cmd === 'profil') {
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender
            try {
                const ppUrl = await sock.profilePictureUrl(target, 'image')
                await sock.sendMessage(sender, { image: { url: ppUrl }, caption: 'Photo de profil' })
            } catch {
                await sock.sendMessage(sender, { text: 'Pas de photo de profil' })
            }
        }
    })
}

connectToWhatsApp()
