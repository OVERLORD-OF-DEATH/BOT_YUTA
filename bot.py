import os
from yowsup.layers.interface import YowInterfaceLayer
from yowsup.layers.protocol_messages.protocolentities import TextMessageProtocolEntity

class BotLayer(YowInterfaceLayer):
    def __init__(self):
        super().__init__()
        self.private_mode = False
        self.admin_num = os.environ.get("ADMIN_NUM", "22900000")

    def onMessage(self, m):
        if m.getFrom() == self.getOwnJid():
            return
        
        msg = m.getBody()
        sender = m.getFrom()
        is_group = "@g.us" in sender

        if not msg:
            return
        msg = msg.lower().strip()

        if self.private_mode and self.admin_num not in sender:
            return

        if msg == "!ping":
            t = "🏓 Pong! Bot OK"
            r = TextMessageProtocolEntity(t, to=sender)
            self.toLower(r)

        elif msg == "!menu":
            t = "🤖 BOT_YUTA\n!ping\n!menu\n!tagadm\n!mode private on/off"
            r = TextMessageProtocolEntity(t, to=sender)
            self.toLower(r)

        elif msg == "!tagadm" and is_group:
            t = "👑 Admin: @"+self.admin_num
            r = TextMessageProtocolEntity(t, to=sender)
            r.setMentions([self.admin_num])
            self.toLower(r)

        elif msg == "!mode private on":
            self.private_mode = True
            t = "🔒 Privé ON"
            r = TextMessageProtocolEntity(t, to=sender)
            self.toLower(r)

        elif msg == "!mode private off":
            self.private_mode = False
            t = "🔓 Privé OFF"
            r = TextMessageProtocolEntity(t, to=sender)
            self.toLower(r)

if __name__ == "__main__":
    from yowsup.layers import YowLayerEvent
    from yowsup.layers.network import YowNetworkLayer
    from yowsup.stacks import YowStack
    
    stack = YowStack((BotLayer, YowNetworkLayer))
    print("🚀 BOT_YUTA start...")
    stack.broadcastEvent(YowLayerEvent(YowNetworkLayer.EVENT_STATE_CONNECT))
    stack.loop()
