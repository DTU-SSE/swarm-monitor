import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.{ServerSocket, Socket}
import java.io.{BufferedReader, InputStreamReader, PrintWriter}
import scala.annotation.tailrec
import scala.concurrent.Future
import scala.concurrent.Await
import scala.concurrent.duration.Duration
import org.apache.logging.log4j.LogManager
import org.apache.logging.log4j.Logger
import notifications.{ActyxEventNotification, StopReceivingNotification}
import pt.unl.fct.di.novasys.babel.core.GenericProtocol
import java.util.Properties
import scala.compiletime.uninitialized
import join_actors.api.{Actor, ActorRef}

// Takes an actor processing messages of type M and producing a result of type T.
class MonitorBridge[M, T](actor: Actor[M, T], val parse: Array[Byte] => M)
    extends GenericProtocol(
      MonitorBridge.protoName,
      MonitorBridge.protoId
    ):

  private val (actorFut, actorRef): (Future[T], ActorRef[M])  = actor.start()

  override def init(properties: Properties): Unit =
    subscribeNotification(
      ActyxEventNotification.notificationId,
      onActyxEventNotification
    )


  // Called when receiving an ActyxEventNotification
  private def onActyxEventNotification(
      actyxEventNotification: ActyxEventNotification,
      sourceProto: Short
  ): Unit =
    val event = parse(actyxEventNotification.payload)
    actorRef ! event


object MonitorBridge:
  val protoName: String = "CarFactoryMonitor"
  val protoId: Short = 102
  val logger: Logger = LogManager.getLogger(MonitorBridge)
