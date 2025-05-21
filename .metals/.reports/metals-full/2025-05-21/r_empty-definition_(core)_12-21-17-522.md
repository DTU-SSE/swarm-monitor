error id: file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocket.scala:`<none>`.
file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocket.scala
empty definition using pc, found symbol in pc: `<none>`.
empty definition using semanticdb
empty definition using fallback
non-local guesses:

offset: 6799
uri: file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocket.scala
text:
```scala
package join_patterns.examples.factory_simple_socket

import actor.*
import actor.Result.*
import join_patterns.MatchingAlgorithm
import join_patterns.receive

import scala.concurrent.Await
import scala.concurrent.duration.Duration

import java.net.{ServerSocket, Socket}
import java.net.{DatagramPacket, DatagramSocket, InetAddress}
import java.io.{BufferedReader, InputStreamReader, PrintWriter}
import scala.concurrent.Future
//import scala.concurrent.ExecutionContext.Implicits.global
import scala.annotation.tailrec

// protobuf stuff. outcommented right now
//import factorymessages.factory.*;

import co.blocke.scalajack.ScalaJack.*
import co.blocke.scalajack.*
/* import join_patterns.examples.factory_simple_socket_types.ForkliftEvent.*
import join_patterns.examples.factory_simple_socket_types.WorkerEvent.*
import join_patterns.examples.factory_simple_socket_types.SystemEvent.*
import join_patterns.examples.factory_simple_socket_types.ActionToJsonFormatter */

import join_patterns.examples.factory_simple_socket_types.Event

// Milliseconds in one minute
private val ONE_MIN    = 1000 * 60
private val ONE_DAY    = ONE_MIN * 60 * 24
private val TEN_MIN    = ONE_MIN * 10
private val QUARTER_HR = ONE_MIN * 15
private val THIRTY_MIN = ONE_MIN * 30

/* def monitor(algorithm: MatchingAlgorithm) =
  Actor[Event, Unit] {
    receive { (self: ActorRef[Event]) =>
      {
        case (Fault(fid1, ts1), Fix(fid2, ts2)) if fid1 == fid2 =>
          println(
            s"========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 01${Console.RESET} =========================\n"
          )
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: Fault(fid = $fid1, ...), Fix(fid = $fid2, ...)${Console.RESET}\n"
          )
          println(
            s"${Console.GREEN}${Console.UNDERLINED}Fault(fid = $fid1) completed in ${(ts2 - ts1) / ONE_MIN} minutes!${Console.RESET}"
          )
          println(
            s"\n========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 01${Console.RESET} ========================="
          )
          Continue

        case (Fault(fid1, ts1), Fault(fid2, ts2), Fix(fid3, ts3))
            if fid2 == fid3 && ts2 > ts1 + TEN_MIN =>
          println(
            s"========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 02${Console.RESET} =========================\n"
          )
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: Fault(fid = $fid1, ...), Fault(fid = $fid2, ...), Fix(fid = $fid3, ...)${Console.RESET}\n"
          )
          println(
            s"${Console.GREEN}${Console.UNDERLINED}Fault(fid = $fid1, ...) ignored for ${(ts2 - ts1) / ONE_MIN} minutes!${Console.RESET}"
          )
          println(
            s"\n========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 02${Console.RESET} ========================="
          )
          self ! DelayedFault(fid1, ts1) // Re-enqueue
          Continue

        case (DelayedFault(fid1, ts1), Fix(fid2, ts2)) if fid1 == fid2 =>
          println(
            s"========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 03${Console.RESET} =========================\n"
          )
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: DelayedFault(fid = $fid1, ...), Fix(fid = $fid2, ...)${Console.RESET}\n"
          )
          println(
            s"${Console.GREEN}${Console.UNDERLINED}Delayed Fault(fid = $fid1, ...) completed in ${(ts2 - ts1) / ONE_MIN} minutes!${Console.RESET}"
          )
          println(
            s"\n========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 03${Console.RESET} ========================="
          )
          Continue

        case Shutdown() =>
          println(
            s"${Console.RED}${Console.UNDERLINED}Shutting down monitor actor...${Console.RESET}"
          )
          Stop(())
      }
    }(algorithm)
  } */

 def monitor(algorithm: MatchingAlgorithm) =
  Actor[Event, Unit] {
    receive { (self: ActorRef[Event]) =>
      {
        case (Pos(position, part)) =>
          /* println(
            s"========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 01${Console.RESET} =========================\n"
          )
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: Fault(fid = $fid1, ...), Fix(fid = $fid2, ...)${Console.RESET}\n"
          )
          println(
            s"${Console.GREEN}${Console.UNDERLINED}Fault(fid = $fid1) completed in ${(ts2 - ts1) / ONE_MIN} minutes!${Console.RESET}"
          )
          println(
            s"\n========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 01${Console.RESET} ========================="
          ) */
          Continue

        /* case (Fault(fid1, ts1), Fault(fid2, ts2), Fix(fid3, ts3))
            if fid2 == fid3 && ts2 > ts1 + TEN_MIN =>
          println(
            s"========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 02${Console.RESET} =========================\n"
          )
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: Fault(fid = $fid1, ...), Fault(fid = $fid2, ...), Fix(fid = $fid3, ...)${Console.RESET}\n"
          )
          println(
            s"${Console.GREEN}${Console.UNDERLINED}Fault(fid = $fid1, ...) ignored for ${(ts2 - ts1) / ONE_MIN} minutes!${Console.RESET}"
          )
          println(
            s"\n========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 02${Console.RESET} ========================="
          )
          self ! DelayedFault(fid1, ts1) // Re-enqueue
          Continue

        case (DelayedFault(fid1, ts1), Fix(fid2, ts2)) if fid1 == fid2 =>
          println(
            s"========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 03${Console.RESET} =========================\n"
          )
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: DelayedFault(fid = $fid1, ...), Fix(fid = $fid2, ...)${Console.RESET}\n"
          )
          println(
            s"${Console.GREEN}${Console.UNDERLINED}Delayed Fault(fid = $fid1, ...) completed in ${(ts2 - ts1) / ONE_MIN} minutes!${Console.RESET}"
          )
          println(
            s"\n========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 03${Console.RESET} ========================="
          )
          Continue

        case Shutdown() =>
          println(
            s"${Console.RED}${Console.UNDERLINED}Shutting down monitor actor...${Console.RESET}"
          )
          Stop(()) */
      }
    }(algorithm)
  }

def runFactorySimpleSocket(algorithm: MatchingAlgorithm) =
  @@val events = List(
    Fault(1, ONE_MIN),
    Fault(2, TEN_MIN),
    Fault(3, QUARTER_HR),
    Fix(3, THIRTY_MIN)
  )
  //given sjEvent: ScalaJack[Event] = sjCodecOf[Event] // create a re-usable Event codec
  //implict val sj: ScalaJack[Event] = sjEvent[Event]
  val (monitorFut, monitorRef) = monitor(algorithm).start()
  val port = 9999
  //val server = new ServerSocket(port)
  val socket = new DatagramSocket(port)
  //println(s"Server started, listening on port $port")

  //events foreach (msg => monitorRef ! msg)

  //monitorRef ! Shutdown()

  //Await.ready(monitorFut, Duration(15, "m"))
  //acceptClients(server)
  println("monitor ready")
  receiveLoop(socket, monitorFut, monitorRef)

// code setting up socket and listening generated by chatGPT
@tailrec
def acceptClients(server: ServerSocket): Unit =
  val client = server.accept()
  println(s"Accepted connection from ${client.getInetAddress}")

  // Handle each client in a separate Future/thread
  Future {
    handleClient(client)
  }


  acceptClients(server)

def handleClient(client: Socket): Unit =
  val in = new BufferedReader(new InputStreamReader(client.getInputStream))
  val out = new PrintWriter(client.getOutputStream, true)

  try {
    val received = in.readLine()
    println(s"Received: $received")
    out.println(s"Hello from server! You said: $received")
  } catch {
    case e: Exception =>
      println(s"Error handling client: ${e.getMessage}")
  } finally {
    client.close()
    println("Closed connection.")
  }


/* def handleClient(client: Socket): Unit =
  val in = new BufferedReader(new InputStreamReader(client.getInputStream))
  val out = new PrintWriter(client.getOutputStream, true)

  try {
    var line: String = null

    // Keep reading until client disconnects or sends "exit"
    while ({ line = in.readLine(); line != null && line != "exit" }) {
      println(s"Received: $line")
      out.println(s"Echo: $line")
    }

    println("Client ended session.")
  } catch {
    case e: Exception =>
      println(s"Error handling client: ${e.getMessage}")
  } finally {
    client.close()
    println("Closed connection.")
  } */

//join_patterns.examples.factory_simple_socket_types.
@tailrec
def receiveLoop(socket: DatagramSocket, monitorFut: Future[Unit], monitorRef: ActorRef[Event]): Unit = {
  val bufferSize = 1024
  val buffer = new Array[Byte](bufferSize)
  val packet = new DatagramPacket(buffer, buffer.length)

  // Receive a packet (blocking)
  socket.receive(packet)

  val message = new String(packet.getData, 0, packet.getLength)
  val clientAddress = packet.getAddress
  val clientPort = packet.getPort

  println(s"Received from $clientAddress:$clientPort → $message")

  // Prepare a response
  val responseMessage = s"Echo: $message"
  val responseBytes = responseMessage.getBytes("UTF-8")
  val responsePacket = new DatagramPacket(responseBytes, responseBytes.length, clientAddress, clientPort)
  //val msg = ActionToJsonFormatter.fromJson[Event](message, Fault(1, ONE_MIN))
  //val msg = JSON.
  //val msg
  println(s"$message")
  //val e = sj.fromJson(message)
  //println(s"$e")
  // Send the response
  socket.send(responsePacket)
  //println(s"Received ${ActionToJsonFormatter.toJson(message, Event)}")
  //monitorRef ! msg

  //monitorRef ! Shutdown()

  //Await.ready(monitorFut, Duration(15, "m"))

  // Tail-recursive call to continue receiving
  receiveLoop(socket, monitorFut, monitorRef)
}

```


#### Short summary: 

empty definition using pc, found symbol in pc: `<none>`.