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
import java.util.concurrent.Executors
import scala.concurrent.{Future, ExecutionContext, Promise}

class ActyxSwarmBridge(stopSignal: Promise[Unit])(using ec: ExecutionContext)
    extends GenericProtocol(
      ActyxSwarmBridge.protoName,
      ActyxSwarmBridge.protoId
    ):

  private var socket: DatagramSocket = uninitialized
  private val buffer: Array[Byte] =
    new Array[Byte](ActyxSwarmBridge.bufferSize)

  override def init(properties: Properties): Unit =

    subscribeNotification(
      StopReceivingNotification.notificationId,
      onStopReceivingNotification
    )

    socket = createDatagramSocket(properties) match
      case Some(socket) => socket
      case None         => return

    println(
      s"${Console.GREEN}🚀 Actyx swarm bridge ready and listening on ${socket
          .getLocalAddress()
          .getHostAddress()}:${socket.getLocalPort()} 📦${Console.RESET}"
    )

    receivePacket()

  // Called when receiving an StopReceivingNotification, emitted by the car factory monitor when it Stop()s
  private def onStopReceivingNotification(
      stopReceivingNotification: StopReceivingNotification,
      sourceProto: Short
  ): Unit =
    stopSignal.success(())
    socket.close

  private def createDatagramSocket(
      properties: Properties
  ): Option[DatagramSocket] =
    val port: Int =
      if properties.containsKey("port") then
        properties
          .getProperty("port")
          .toIntOption
          .getOrElse(ActyxSwarmBridge.defaultPort)
      else ActyxSwarmBridge.defaultPort

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

  private def receivePacket(): Unit =
    Future {
      if stopSignal.isCompleted then ()
      else
        val packet = new DatagramPacket(buffer, ActyxSwarmBridge.bufferSize)

        socket.receive(packet)

        val data = java.util.Arrays.copyOfRange(
          packet.getData,
          packet.getOffset,
          packet.getOffset + packet.getLength
        )

        triggerNotification(new ActyxEventNotification(data))

        receivePacket()
    }

object ActyxSwarmBridge:
  val protoName: String = "ActyxEventAdaptor"
  val protoId: Short = 101
  val defaultPort: Int = 9999
  val bufferSize: Int = 4096
  val logger: Logger = LogManager.getLogger(ActyxSwarmBridge)
