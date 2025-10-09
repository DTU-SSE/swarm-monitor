package requests;

import pt.unl.fct.di.novasys.babel.generic.ProtoRequest;
import pt.unl.fct.di.novasys.network.data.Host;

case class ActyxEventRequest(payload: Array[Byte]) 
    extends ProtoRequest(ActyxEventRequest.requestId)

object ActyxEventRequest:
  val requestId: Short = 1