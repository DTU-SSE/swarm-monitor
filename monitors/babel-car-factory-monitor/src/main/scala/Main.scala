import join_actors.api.*
//import car_factory_monitor.runCarFactoryMonitor

import mainargs.Flag
import mainargs.ParserForClass
import mainargs.ParserForMethods
import mainargs.TokensReader
import mainargs.arg
import mainargs.main

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import pt.unl.fct.di.novasys.babel.core.Babel;
import pt.unl.fct.di.novasys.babel.exceptions.HandlerRegistrationException;
import pt.unl.fct.di.novasys.babel.exceptions.InvalidParameterException;
import pt.unl.fct.di.novasys.babel.exceptions.ProtocolAlreadyExistsException;

import java.io.IOException;
import java.util.Properties;

import java.util.concurrent.Executors
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future, Promise, ExecutionContext}

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

    val carFactoryMonitor: CarFactoryMonitor = new CarFactoryMonitor
    val actyxEventAdaptor: ActyxEventAdaptor = new ActyxEventAdaptor(stopSignal)

    babel.registerProtocol(carFactoryMonitor)
    babel.registerProtocol(actyxEventAdaptor)

    carFactoryMonitor.init(properties)
    actyxEventAdaptor.init(properties)

    babel.start()

    Await.ready(stopSignal.future, Duration.Inf)
    executor.shutdown()
