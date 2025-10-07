package car_factory_monitor

import join_actors.api.*
import car_factory_messages.car_factory.Event
import car_factory_messages.car_factory.EventMessage
import car_factory_messages.car_factory.Meta
import car_factory_messages.car_factory.SteelRoll
import car_factory_messages.car_factory.SteelParts
import car_factory_messages.car_factory.PartialCarBody
import car_factory_messages.car_factory.CarBody
import car_factory_messages.car_factory.PaintedCarBody
import car_factory_messages.car_factory.ItemRequest
import car_factory_messages.car_factory.Bid
import car_factory_messages.car_factory.Selected
import car_factory_messages.car_factory.ReqGuidance
import car_factory_messages.car_factory.GiveGuidance
import car_factory_messages.car_factory.ItemPickupBasic
import car_factory_messages.car_factory.ItemPickupSmart
import car_factory_messages.car_factory.Handover
import car_factory_messages.car_factory.ItemDeliver
import car_factory_messages.car_factory.RequestEngine
import car_factory_messages.car_factory.EngineInstalled
import car_factory_messages.car_factory.EngineChecked
import car_factory_messages.car_factory.WheelPickup
import car_factory_messages.car_factory.WheelInstalled
import car_factory_messages.car_factory.AllWheelsInstalled
import car_factory_messages.car_factory.WindowPickup
import car_factory_messages.car_factory.WindowInstalled
import car_factory_messages.car_factory.AllWindowsInstalled
import car_factory_messages.car_factory.FinishedCar

import java.net.DatagramPacket
import java.net.DatagramSocket
import scala.annotation.tailrec
import scala.concurrent.Await
import scala.concurrent.Future
import scala.concurrent.duration.Duration

def monitor(algorithm: MatchingAlgorithm) =
  Actor[Event, Unit] {
    receive { (self: ActorRef[Event]) =>
      {
        case SteelParts(part, meta, _, _) =>
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: SteelParts(part = $part, ...)${Console.RESET}\n"
          )
          Continue
        //Some(_, _, _, _, _, eventId1, _, _, _)
        case CarBody(shape1, meta1, lbj1, _)
             &:& PaintedCarBody(shape2, color2, meta2, lbj2, _) if shape1 == shape2 =>
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: CarBody(shape = $shape1, ...), PaintedCarBody(shape = $shape2, color = $color2, ...)${Console.RESET}\n"
          )
          //printMetaInner(meta1)
          //printMetaInner(meta2)
          Continue
        case FinishedCar(_, _, _, _, _, _, meta, _, _) =>
          println(
            s"${Console.RED}${Console.UNDERLINED}Matched messages: FinishedCar(...)${Console.RESET}\n"
          )
          //printMetaInner(meta)
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
  receiveLoop(socket, monitorFut, monitorRef)