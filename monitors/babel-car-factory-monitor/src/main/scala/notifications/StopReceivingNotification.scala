package notifications

import pt.unl.fct.di.novasys.babel.generic.ProtoNotification
import pt.unl.fct.di.novasys.network.data.Host

case class StopReceivingNotification()
    extends ProtoNotification(StopReceivingNotification.notificationId)

object StopReceivingNotification:
  val notificationId: Short = 102
