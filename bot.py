import os
from yowsup.layers.interface import YowInterfaceLayer
from yowsup.layers.protocol_messages.protocolentities import TextMessageProtocolEntity

class BotLayer(YowInterfaceLayer):
    def onMessage(self, messageProtocolEntity):
        if messageProtocolEntity.getFrom() == self.getOwnJid():
            return
        message = messageProtocolEntity.getBody()
        sender = messageProtocolEntity.getFrom()
        
        if message and message.lower() == "!ping":
            reply = TextMessageProtocolEntity("🏓 Pong! Bot YUTA Render OK", to=sender)
            self.toLower(reply)
        elif message and message.lower() == "!menu":
            reply = TextMessageProtocolEntity("🤖 BOT_YUTA\n!ping - Test\n!menu - Liste", to=sender)
            self.toLower(reply)

if __name__ == "__main__":
    from yowsup.layers import YowLayerEvent
    from yowsup.layers.network import YowNetworkLayer
    from yowsup.stacks import YowStack
    layers = (BotLayer, YowNetworkLayer)
    stack = YowStack(layers)
    stack.broadcastEvent(YowLayerEvent(YowNetworkLayer.EVENT_STATE_CONNECT))
    stack.loop()
