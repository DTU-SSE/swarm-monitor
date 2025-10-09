import org.apache.logging.log4j.LogManager
import org.apache.logging.log4j.Logger
import notifications.ActyxEventNotification
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
import scala.concurrent.Await
import scala.concurrent.blocking
import scala.concurrent.duration.Duration
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Success
import scala.util.Failure

implicit val ec: ExecutionContext =
  ExecutionContext.fromExecutorService(Executors.newVirtualThreadPerTaskExecutor())

class ActyxEventAdaptor
    extends GenericProtocol(
      ActyxEventAdaptor.protoName,
      ActyxEventAdaptor.protoId
    ):

  private var socket: DatagramSocket = uninitialized
  private val buffer: Array[Byte] =
    new Array[Byte](ActyxEventAdaptor.bufferSize)

  override def init(properties: Properties): Unit =
    socket = createDatagramSocket(properties) match
      case Some(socket) => socket
      case None         => return

    println(
      s"${Console.GREEN}🚀 Actyx Event Adaptor ready and listening on ${socket
          .getLocalAddress()
          .getHostAddress()}:${socket.getLocalPort()} 📦${Console.RESET}"
    )
    val future = receivePackets()
    Await.result(future, Duration.Inf)
    /*
    future.onComplete {
        case Success(_) => println("Finished receiving packets")
        case Failure(exception) => println(s"Receiving failed: ${exception.getMessage}")
    }
    sys.addShutdownHook {
        println("Closing socket...")
        socket.close()
        //ec.shutdown()
    }

    // Keep JVM alive without blocking
    Future.never.foreach(_ => ()) */

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
      case Some(addresss) =>
        Some(DatagramSocket(port, InetAddress.getByName(addresss)))
      case None => None

  //@tailrec
  private def receivePackets(): Future[Unit] =//(using ec: ExecutionContext): Future[Unit] =
    if socket.isClosed then 
        //Future.successful((println("Socket closed.")))
        Future.unit
    else
        val packet = new DatagramPacket(buffer, ActyxEventAdaptor.bufferSize)
        // Receive a packet (blocking)
        /* socket.receive(packet)
        // extract payload from packet, remove any trailing 0s
        val data = java.util.Arrays.copyOfRange(
        packet.getData,
        packet.getOffset,
        packet.getOffset + packet.getLength
        )
        //println(s"Received: ${data}")
        triggerNotification(new ActyxEventNotification(data))
        receivePackets() */
        // Receive a packet (non-blocking)
        val receiveFuture = Future(blocking(socket.receive(packet)))
        receiveFuture
            .map { _ => 
                // extract payload from packet, remove any trailing 0s
                val data = java.util.Arrays.copyOfRange(
                    packet.getData,
                    packet.getOffset,
                    packet.getOffset + packet.getLength
                )
                println(s"Received: ${data}")
                triggerNotification(new ActyxEventNotification(data))
            }
            .recover { case e => println(s"Receive failed: ${e.getMessage}") }
            // Wait for next packet
            .flatMap(_ => receivePackets())
        /* val future = Future {
            socket.receive(packet)
            val data = java.util.Arrays.copyOfRange(
                    packet.getData,
                    packet.getOffset,
                    packet.getOffset + packet.getLength
            )
            println(s"Received: ${data}")
            triggerNotification(new ActyxEventNotification(data))
        }
        future.flatMap(_ => receivePackets()) */

object ActyxEventAdaptor:
  val protoName: String = "ActyxEventAdaptor"
  val protoId: Short = 101
  val defaultPort: Int = 9999
  val bufferSize: Int = 4096
  val logger: Logger = LogManager.getLogger(ActyxEventAdaptor)
