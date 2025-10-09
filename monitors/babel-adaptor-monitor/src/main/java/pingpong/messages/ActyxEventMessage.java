package pingpong.messages;

import io.netty.buffer.ByteBuf;
import pt.unl.fct.di.novasys.babel.generic.ProtoMessage;
import pt.unl.fct.di.novasys.network.ISerializer;

public class ActyxEventMessage extends ProtoMessage {

    public static final short MSG_ID = 103;

    private final byte[] payload;
    public ActyxEventMessage(byte[] payload) {
        super(MSG_ID);
        this.payload = payload;
    }

    public byte[] getPayload() {
        return payload;
    }

    public static ISerializer<? extends ProtoMessage> serializer = new ISerializer<ActyxEventMessage>() {
        public void serialize(ActyxEventMessage msg, ByteBuf out) {
            out.writeInt(msg.payload.length);
            out.writeBytes(msg.payload);
        }

        public ActyxEventMessage deserialize(ByteBuf in) {
            byte[] bytes = new byte[in.readInt()];
            in.readBytes(bytes);
            return new ActyxEventMessage(bytes);
        }
    };

}
