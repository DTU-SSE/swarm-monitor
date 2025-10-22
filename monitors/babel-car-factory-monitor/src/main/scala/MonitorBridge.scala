import join_actors.api.*
import car_factory_messages.car_factory.*

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

class MonitorBridge
    extends GenericProtocol(
      MonitorBridge.protoName,
      MonitorBridge.protoId
    ):

  private val (monitorFut, monitorRef): (Future[Unit], ActorRef[Event]) =
    monitor(MonitorBridge.algorithm).start()

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
    val event = EventMessage.parseFrom(actyxEventNotification.payload).toEvent
    monitorRef ! event

  // Match actyx events against join patterns
  def monitor(algorithm: MatchingAlgorithm) =
    Actor[Event, Unit] {
      receive { (self: ActorRef[Event]) =>
        {
          case SteelRoll(meta, _, _) =>
            println(
              s"${Console.BLUE}${Console.UNDERLINED}Matched messages: SteelRoll(...)${Console.RESET}\n"
            )
            Continue
          case SteelParts(part, meta, _, _) =>
            println(
              s"${Console.BLUE}${Console.UNDERLINED}Matched messages: SteelParts(part = $part, ...)${Console.RESET}\n"
            )
            Continue
          case CarBody(shape1, meta1, lbj1, _)
              &:& PaintedCarBody(shape2, color2, meta2, lbj2, _)
              if shape1 == shape2 =>
            println(
              s"${Console.BLUE}${Console.UNDERLINED}Matched messages: CarBody(shape = $shape1, ...), PaintedCarBody(shape = $shape2, color = $color2, ...)${Console.RESET}\n"
            )
            Continue
          case FinishedCar(_, _, _, _, _, _, meta, _, _) =>
            println(
              s"${Console.RED}${Console.UNDERLINED}Matched messages: FinishedCar(...)${Console.RESET}\n"
            )
            println(
              s"${Console.RED}${Console.UNDERLINED}Shutting down monitor actor...${Console.RESET}"
            )
            triggerNotification(new StopReceivingNotification)
            Stop(())
        }
      }(algorithm)
    }

  def printMetaInner(meta: Option[Meta]) = meta match
    case Some(value) =>
      println(
        s"Offset: ${value.offset} Timestamp: ${value.lamport}. eventID: ${value.eventId}"
      )
    case None => ()

object MonitorBridge:
  val protoName: String = "CarFactoryMonitor"
  val protoId: Short = 102
  val logger: Logger = LogManager.getLogger(MonitorBridge)
  val algorithm: MatchingAlgorithm = MatchingAlgorithm.WhileLazyAlgorithm
