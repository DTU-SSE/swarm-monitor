import join_actors.api.*
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import pt.unl.fct.di.novasys.babel.core.Babel;
import java.util.Properties;

import java.util.concurrent.Executors
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Promise, ExecutionContext}
import car_factory_messages.car_factory.{EventMessage, Event}

object Main:

  val logger: Logger = LogManager.getLogger(getClass)

  def main(args: Array[String]): Unit =

    val executor = Executors.newFixedThreadPool(
      1,
      r => {
        val t = new Thread(r)
        t.setDaemon(false)
        t
      }
    )
    val ec: ExecutionContext = ExecutionContext.fromExecutor(executor)
    val stopSignal = Promise[Unit]()

    val babel: Babel = Babel.getInstance

    val properties: Properties = Babel.loadConfig(args, null)
    val actyxSwarmBridge: ActyxSwarmBridge = new ActyxSwarmBridge(stopSignal)

    val carFactoryMonitor = monitor(MatchingAlgorithm.WhileLazyAlgorithm)
    val parse: (Array[Byte]) => Event = (payload: Array[Byte]) => EventMessage.parseFrom(payload).toEvent
    val monitorBridge: MonitorBridge[Event, Unit] = new MonitorBridge(carFactoryMonitor, parse)

    babel.registerProtocol(actyxSwarmBridge)
    babel.registerProtocol(monitorBridge)

    monitorBridge.init(properties)
    actyxSwarmBridge.init(properties)

    babel.start()

    Await.ready(stopSignal.future, Duration.Inf)
    executor.shutdown()
