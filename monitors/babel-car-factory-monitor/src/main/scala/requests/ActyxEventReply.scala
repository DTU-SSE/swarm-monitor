package requests;

import pt.unl.fct.di.novasys.babel.generic.ProtoReply;
import pt.unl.fct.di.novasys.network.data.Host;

case class ActyxEventReply() 
    extends ProtoReply(ActyxEventReply.replyId)

object ActyxEventReply:
  val replyId: Short = 2