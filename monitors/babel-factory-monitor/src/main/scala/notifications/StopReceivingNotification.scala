package notifications

import pt.unl.fct.di.novasys.babel.generic.ProtoNotification

case class StopReceivingNotification()
    extends ProtoNotification(StopReceivingNotification.notificationId)

object StopReceivingNotification:
  val notificationId: Short = 102
