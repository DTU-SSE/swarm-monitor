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

object Main:
  /* @main
  case class CommonRunConfig(
    @arg(doc = "The join pattern matching algorithm to use" +
      "Algorithm options: " + MatchingAlgorithm.CMD_STRINGS.mkString(", "))
    algorithm: MatchingAlgorithm = WhileLazyAlgorithm,
  )

  implicit def configParser: ParserForClass[CommonRunConfig] = ParserForClass[CommonRunConfig]

  implicit object MatchingAlgorithmParser extends TokensReader.Simple[MatchingAlgorithm]:
    def shortName: String = "algorithm"
    def read(tokens: Seq[String]): Either[String, MatchingAlgorithm] =
      tokens.headOption.flatMap(MatchingAlgorithm.parseFromCmdString).toRight("Invalid algorithm, should be one of the following: "
        + System.lineSeparator() + MatchingAlgorithm.CMD_STRINGS.mkString(", "))


  @main
  def carFactoryMonitor(
    @arg(name = "algorithm", doc = "Matching algorithm to use (default: WhileLazyAlgorithm)")
    algorithm: MatchingAlgorithm = MatchingAlgorithm.WhileLazyAlgorithm,
    @arg(name = "port", doc = "Port to listen on (default: 9999)")
    port: Int = 9999,
    @arg(name = "host", doc = "Host to listen on (default: localhost)")
    host: String = "localhost"
  ): Unit =
    runCarFactoryMonitor(algorithm, port, host)

  def main(args: Array[String]): Unit =
    ParserForMethods(this).runOrExit(args) */

  val logger: Logger = LogManager.getLogger(getClass)
  @main
  def main(args: Array[String]): Unit =
    val babel: Babel = Babel.getInstance

    val properties: Properties = Babel.loadConfig(args, null)

    val carFactoryMonitor: CarFactoryMonitor = new CarFactoryMonitor
    val actyxEventAdaptor: ActyxEventAdaptor = new ActyxEventAdaptor

    babel.registerProtocol(carFactoryMonitor)
    babel.registerProtocol(actyxEventAdaptor)

    carFactoryMonitor.init(properties)
    actyxEventAdaptor.init(properties)

    babel.start()
    //Thread.sleep(Long.MaxValue)