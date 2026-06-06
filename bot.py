import os, asyncio
from yowsup.layers import YowLayer, YowStackBuilder
from yowsup.layers.protocol_messages import YowMessagesProtocolLayer
from yowsup.stacks import YowStack

# ===== CONFIG =====
ADMIN_NUM = "243896467916"  # Ton numéro sans +
PHONE = "243896467916"      # Pour code SMS
CC = "243"                  # RDC
MCC = "630"                 # 630 = RDC  
MNC = "02"                  # 02=Airtel, 01=Vodacom, 10=Orange
PREFIX = "!"
PRIVATE_MODE = False        # mode private on/off

SESSION_FILE = "yowsup_config.json"

# Code SMS au 1er lancement
if not os.path.exists(SESSION_FILE):
    print(f"\n📱 SMS envoyé à {PHONE}...")
    os.system(f'yowsup-cli registration --requestcode sms --phone {PHONE} --cc {CC} --mcc {MCC} --mnc {MNC}')
    code = input("Code reçu par SMS/WhatsApp : ")
    os.system(f'yowsup-cli registration --register {code} --phone {PHONE} --cc {CC}')
    print("✅ Session créée ! Relance.")
    exit()

class BotLayer(YowLayer):
    def onMessage(self, message):
        if not message.getBody(): return
        body = message.getBody().strip()
        sender = message.getFrom()
        chat = message.getFrom(False)
        
        # mode private on/off
        global PRIVATE_MODE
        if body.lower() == f"{PREFIX}mode private on":
            PRIVATE_MODE = True
            reply = message.__class__.fromText("Mode privé: ON. Seul le résultat s'affiche.", chat)
            self.toLower(reply); return
        elif body.lower() == f"{PREFIX}mode private off":
            PRIVATE_MODE = False
            reply = message.__class__.fromText("Mode privé: OFF. Commandes visibles.", chat)
            self.toLower(reply); return
        
        # Cache la commande si mode private ON
        if not PRIVATE_MODE:
            print(f"[{chat}] {sender}: {body}")
        
        # Commandes safe
        if body.lower() == f"{PREFIX}ping":
            reply = message.__class__.fromText("Pong 🏓 Bot Yuta en ligne", chat)
            self.toLower(reply)
        
        elif body.lower() == f"{PREFIX}help":
            text = f"""*BOT YUTA v1.0*

{PREFIX}ping - Test bot
{PREFIX}help - Ce menu
{PREFIX}menu - Menu stylé  
{PREFIX}tagadm - Contacter admin
{PREFIX}sticker - Image→Sticker. Réponds à une image
{PREFIX}profil - Photo profil. Tag qlq
{PREFIX}mode private on/off - Cache les commandes

*Admin* : +{ADMIN_NUM}"""
            reply = message.__class__.fromText(text, chat)
            self.toLower(reply)
        
        elif body.lower() == f"{PREFIX}menu":
            text = f"""╭─ *YUTA BOT* ─╮
│ {PREFIX}ping → Test
│ {PREFIX}help → Aide  
│ {PREFIX}tagadm → Appeler admin
│ {PREFIX}sticker → Img→Sticker
│ {PREFIX}profil → Photo profil
│ {PREFIX}mode private → Cache cmd
╰─ RDC +243 ─╯"""
            reply = message.__class__.fromText(text, chat)
            self.toLower(reply)
        
        elif body.lower() == f"{PREFIX}tagadm":
            jid_admin = f"{ADMIN_NUM}@s.whatsapp.net"
            text = f"Admin du bot appelé 🚨"
            msg = message.__class__.fromText(text, chat)
            msg.setMentions([jid_admin])
            self.toLower(msg)

stack = YowStackBuilder().pushDefaultLayers(True).push(BotLayer).build()
stack.setCredentials((PHONE, None))
stack.broadcastEvent(YowStack.EVENT_START)
stack.loop()
