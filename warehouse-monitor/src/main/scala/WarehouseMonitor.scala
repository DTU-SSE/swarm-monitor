package warehouse_monitor

import join_actors.api.*
import warehouse_messages.warehouse.ClosingTime
import warehouse_messages.warehouse.Event
import warehouse_messages.warehouse.EventMessage
import warehouse_messages.warehouse.Meta
import warehouse_messages.warehouse.PartOK
import warehouse_messages.warehouse.PartReq
import warehouse_messages.warehouse.Pos

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
        case PartReq(part1, meta1, lbj1, _)
             &:& Pos(position, part2, meta2, lbj2, _)
             &:& PartOK( part3, meta3, lbj3, _) => //if part1 == part2 && part2 == part3 =>
          println(
            s"========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 01${Console.RESET} =========================\n"
          )
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: PartReq(id = $part1, ...), Pos(position = $position, id = $part2, ...), PartOK(id = $part3, ...)${Console.RESET}\n"
          )
          printMetaInner(meta1)
          printMetaInner(meta2)
          printMetaInner(meta3)
          println(
            s"\n========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 01${Console.RESET} ========================="
          )
          Continue
        case PartReq(part1, meta1, lbj1, _)
             &:& Pos(position, part2, meta2, lbj2, _)
             &:& PartOK(part3, meta3, lbj3, _) if part2 == "broken part" && part2 == part3 && lbj2 == lbj3 =>
          println(
            s"========================= ${Console.YELLOW}${Console.UNDERLINED}Join Pattern 02${Console.RESET} =========================\n"
          )
          println(
            s"${Console.YELLOW}${Console.UNDERLINED}Matched messages: PartReq(id = $part1, ...), PartReq(position = $position, id = $part2, ...), PartOK(id = $part3, ...)${Console.RESET}\n"
          )
          printMetaInner(meta1)
          printMetaInner(meta2)
          printMetaInner(meta3)
          println(
            s"\n========================= ${Console.YELLOW}${Console.UNDERLINED}Join Pattern 02${Console.RESET} ========================="
          )
          Continue
        case ClosingTime(time, meta, lbj, _) =>
          println(
            s"${Console.RED}${Console.UNDERLINED}Matched messages: ClosingTime(timeOfDay = $time, ...)${Console.RESET}\n"
          )
          printMetaInner(meta)
          println(
            s"${Console.RED}${Console.UNDERLINED}Shutting down monitor actor...${Console.RESET}"
          )
          Stop(())
      }
    }(algorithm)
  }

def printMeta(e: Event) = e match
  case PartReq(partName, meta, lbj, unknownFields)       => printMetaInner(meta)
  case PartOK(partName, meta, lbj, unknownFields)        => printMetaInner(meta)
  case Pos(position, partName, meta, lbj, unknownFields) => printMetaInner(meta)
  case ClosingTime(timeOfDay, meta, lbj, unknownFields)  => printMetaInner(meta)
  case _                                                 => ()

def printMetaInner(meta: Option[Meta]) = meta match
  case Some(value) =>
    println(s"Offset: ${value.offset} Timestamp: ${value.lamport}. eventID: ${value.eventId}")
  case None => ()

def runWarehouseMonitor(algorithm: MatchingAlgorithm, port: Int, host: String) =
  val (monitorFut, monitorRef) = monitor(algorithm).start()
  val socket                   = new DatagramSocket(port, java.net.InetAddress.getByName(host))

  println(
    s"${Console.GREEN}🚀 Warehouse Monitor ready and listening on ${host}:${port} 📦${Console.RESET}"
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
  println(event)
  monitorRef ! event

  // FIXME
  // Tail-recursive call to continue receiving
  receiveLoop(socket, monitorFut, monitorRef)
