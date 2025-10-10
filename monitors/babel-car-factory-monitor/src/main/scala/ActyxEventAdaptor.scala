import org.apache.logging.log4j.LogManager
import org.apache.logging.log4j.Logger
import notifications.{ActyxEventNotification, StopReceivingNotification}
import pt.unl.fct.di.novasys.babel.core.GenericProtocol
import pt.unl.fct.di.novasys.babel.exceptions.HandlerRegistrationException
import pt.unl.fct.di.novasys.network.data.Host
import java.util.Properties
import java.net.{DatagramSocket, DatagramPacket}
import java.net.InetAddress
import utils.NetworkingUtilities
import scala.compiletime.uninitialized
import scala.annotation.tailrec
import akka.actor._
import akka.io.{IO, Udp}
import akka.util.ByteString
import java.net.InetSocketAddress
import scala.concurrent.Await
import scala.concurrent.duration.Duration

//import requests.{ActyxEventRequest, ActyxEventReply}
/* import java.util.concurrent.Executors
import scala.concurrent.Await
import scala.concurrent.blocking
import scala.concurrent.duration.Duration
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Success
import scala.util.Failure */

/* implicit val ec: ExecutionContext =
  ExecutionContext.fromExecutorService(Executors.newVirtualThreadPerTaskExecutor()) */

class ActyxEventAdaptor
    extends GenericProtocol(
      ActyxEventAdaptor.protoName,
      ActyxEventAdaptor.protoId
    ):

  private var socket: DatagramSocket = uninitialized
  private val buffer: Array[Byte] =
    new Array[Byte](ActyxEventAdaptor.bufferSize)

  override def init(properties: Properties): Unit =
    subscribeNotification(StopReceivingNotification.notificationId, onStopReceivingNotification)
    /* socket = createDatagramSocket(properties) match
      case Some(socket) => socket
      case None         => return */
    val system = ActorSystem("udpServerSystem")
    val actorRef: ActorRef = createUdpServer(properties, system) match
      case Some(actorRef) => actorRef
      case None           => return
    /* println(
      s"${Console.GREEN}🚀 Actyx Event Adaptor ready and listening on ${socket
          .getLocalAddress()
          .getHostAddress()}:${socket.getLocalPort()} 📦${Console.RESET}"
    ) */
    /* CoordinatedShutdown(system).addJvmShutdownHook {
      println("Shutting down UDP server...")
      system.terminate()
    } */
    sys.addShutdownHook {
      println("Shutting down UDP server...")
      system.terminate()
    }

    Await.result(system.whenTerminated, Duration.Inf)
    //receivePacket()
    //new Thread(() => receivePacket()).start()

  private def onStopReceivingNotification(stopReceivingNotification: StopReceivingNotification, sourceProto: Short): Unit =
    println("Closing socket")
    socket.close

  private def createDatagramSocket(
      properties: Properties
  ): Option[DatagramSocket] =
    val port: Int =
      if properties.containsKey("port") then
        properties
          .getProperty("port")
          .toIntOption
          .getOrElse(ActyxEventAdaptor.defaultPort)
      else ActyxEventAdaptor.defaultPort

    val addressString =
      if properties.containsKey("interface") then
        NetworkingUtilities.getAddress(properties.getProperty("interface"))
      else if properties.containsKey("address") then
        Some(properties.getProperty("address"))
      else NetworkingUtilities.getAddress("eth0")

    addressString match
      case Some(address) =>
        Some(DatagramSocket(port, InetAddress.getByName(address)))
      case None => None

  private def createUdpServer(
      properties: Properties,
      system: ActorSystem
  ): Option[ActorRef] =
    val port: Int =
      if properties.containsKey("port") then
        properties
          .getProperty("port")
          .toIntOption
          .getOrElse(ActyxEventAdaptor.defaultPort)
      else ActyxEventAdaptor.defaultPort

    val addressString =
      if properties.containsKey("interface") then
        NetworkingUtilities.getAddress(properties.getProperty("interface"))
      else if properties.containsKey("address") then
        Some(properties.getProperty("address"))
      else NetworkingUtilities.getAddress("eth0")

    addressString match
      case Some(address) =>
            Some(createActor(system, port, address))
      case None => None

  def createActor(system: ActorSystem, port: Int, address: String): ActorRef =
    val receiver = system.actorOf(Props(new Actor {
      def receive: Receive = {
        case Udp.Bound(local) =>
          println(s"UDP server bound to $local")
        case Udp.Received(data, sender) =>
          triggerNotification(new ActyxEventNotification(data.toArray))
      }
    }))

    val udpManager = IO(Udp)(system)
    udpManager ! Udp.Bind(receiver, new InetSocketAddress(address, port))
    receiver

  @tailrec
  private def receivePacket(): Unit =
    if socket.isClosed then
        ()
    else
        val packet = new DatagramPacket(buffer, ActyxEventAdaptor.bufferSize)
        // Receive a packet (blocking)
        socket.receive(packet)
        // extract payload from packet, remove any trailing 0s
        val data = java.util.Arrays.copyOfRange(
        packet.getData,
        packet.getOffset,
        packet.getOffset + packet.getLength
        )
        triggerNotification(new ActyxEventNotification(data))
        receivePacket()

object ActyxEventAdaptor:
  val protoName: String = "ActyxEventAdaptor"
  val protoId: Short = 101
  val defaultPort: Int = 9999
  val bufferSize: Int = 4096
  val logger: Logger = LogManager.getLogger(ActyxEventAdaptor)

/* object UdpServer:

  def createUdpServer(system: ActorSystem, port: Int, address: String): ActorRef =
    val receiver = system.actorOf(Props(new Actor {
      def receive: Receive = {
        case Udp.Bound(local) =>
          println(s"UDP server bound to $local")
        case Udp.Received(data, sender) =>
          println(s"Received from $sender: ${data.utf8String.trim}")
          triggerNotification(new ActyxEventNotification(data.toArray))
      }
    }))

    val udpManager = IO(Udp)(system)
    udpManager ! Udp.Bind(receiver, new InetSocketAddress(address, port))
    receiver */
