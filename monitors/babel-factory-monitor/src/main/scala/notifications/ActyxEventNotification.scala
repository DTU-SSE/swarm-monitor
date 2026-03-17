package notifications

import pt.unl.fct.di.novasys.babel.generic.ProtoNotification

case class ActyxEventNotification(payload: Array[Byte])
    extends ProtoNotification(ActyxEventNotification.notificationId)

object ActyxEventNotification:
  val notificationId: Short = 101
