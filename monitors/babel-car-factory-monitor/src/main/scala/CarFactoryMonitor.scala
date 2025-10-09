import join_actors.api.*
import car_factory_messages.car_factory.*

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.{ServerSocket, Socket}
import java.io.{BufferedReader, InputStreamReader, PrintWriter}
import scala.annotation.tailrec
import scala.concurrent.Await
import scala.concurrent.Future
import scala.concurrent.duration.Duration
import org.apache.logging.log4j.LogManager
import org.apache.logging.log4j.Logger
import notifications.ActyxEventNotification
import pt.unl.fct.di.novasys.babel.core.GenericProtocol
import java.util.Properties
import scala.compiletime.uninitialized

class CarFactoryMonitor
    extends GenericProtocol(
      CarFactoryMonitor.protoName,
      CarFactoryMonitor.protoId
    ):

  //private var monitorFut: Future[Unit] = uninitialized
  //private var monitorRef: ActorRef[Event] = uninitialized
  private val (monitorFut, monitorRef): (Future[Unit], ActorRef[Event]) = monitor(CarFactoryMonitor.algorithm).start()

  override def init(properties: Properties): Unit =
    println("HEHEHEHE FROM CARFACTORYMONITOR INIT")
    subscribeNotification(ActyxEventNotification.notificationId, onActyxEventNotification)
    println("HEHEHEHE FROM CARFACTORYMONITOR INIT 2")
    


  // Called when receiving an ActyxEventNotification
  private def onActyxEventNotification(actyxEventNotification: ActyxEventNotification, sourceProto: Short): Unit = 
    println("HEHEHEHE FROM CARFACTORYMONITOR 3")
    val event = EventMessage.parseFrom(actyxEventNotification.payload).toEvent
    monitorRef ! event


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
              &:& PaintedCarBody(shape2, color2, meta2, lbj2, _) if shape1 == shape2 =>
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
            Stop(())
        }
      }(algorithm)
    }

  def printMetaInner(meta: Option[Meta]) = meta match
    case Some(value) =>
      println(s"Offset: ${value.offset} Timestamp: ${value.lamport}. eventID: ${value.eventId}")
    case None => ()


object CarFactoryMonitor:
  val protoName: String = "CarFactoryMonitor"
  val protoId: Short = 102
  val logger: Logger = LogManager.getLogger(CarFactoryMonitor)
  val algorithm: MatchingAlgorithm = MatchingAlgorithm.WhileLazyAlgorithm

/* def monitor(algorithm: MatchingAlgorithm) =
  Actor[Event, Unit] {
    receive { (self: ActorRef[Event]) =>
      {
        case SteelParts(part, meta, _, _) =>
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: SteelParts(part = $part, ...)${Console.RESET}\n"
          )
          Continue
        case CarBody(shape1, meta1, lbj1, _)
             &:& PaintedCarBody(shape2, color2, meta2, lbj2, _) if shape1 == shape2 =>
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
          Stop(())
      }
    }(algorithm)
  }

def printMetaInner(meta: Option[Meta]) = meta match
  case Some(value) =>
    println(s"Offset: ${value.offset} Timestamp: ${value.lamport}. eventID: ${value.eventId}")
  case None => ()

// UDP version
def runCarFactoryMonitor(algorithm: MatchingAlgorithm, port: Int, host: String) =
  val (monitorFut, monitorRef) = monitor(algorithm).start()
  val socket                   = new DatagramSocket(port, java.net.InetAddress.getByName(host))

  println(
    s"${Console.GREEN}🚀 Car factory Monitor ready and listening on ${host}:${port} 📦${Console.RESET}"
  )
  receiveLoop(socket, monitorFut, monitorRef)

@tailrec
def receiveLoop(
    socket: DatagramSocket,
    monitorFut: Future[Unit],
    monitorRef: ActorRef[Event]
): Unit =
  val bufferSize = 4096
  val packet     = new DatagramPacket(new Array[Byte](bufferSize), bufferSize)
  // Receive a packet (blocking)
  socket.receive(packet)
  // extract payload from packet, remove any trailing 0s
  val data = java.util.Arrays.copyOfRange(
    packet.getData,
    packet.getOffset,
    packet.getOffset + packet.getLength
  )

  val event = EventMessage.parseFrom(data).toEvent
  monitorRef ! event

  // FIXME
  // Tail-recursive call to continue receiving
  receiveLoop(socket, monitorFut, monitorRef) */
