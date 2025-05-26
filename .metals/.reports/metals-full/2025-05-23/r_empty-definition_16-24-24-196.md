error id: file://<WORKSPACE>/join-actors/core/src/main/scala/Main.scala:`<none>`.
file://<WORKSPACE>/join-actors/core/src/main/scala/Main.scala
empty definition using pc, found symbol in pc: `<none>`.
empty definition using semanticdb
empty definition using fallback
non-local guesses:

offset: 3337
uri: file://<WORKSPACE>/join-actors/core/src/main/scala/Main.scala
text:
```scala
package core

import actor.*
import actor.Result.*
import join_patterns.MatchingAlgorithm
import join_patterns.MatchingAlgorithm.BruteForceAlgorithm
import join_patterns.MatchingAlgorithm.StatefulTreeBasedAlgorithm
import join_patterns.examples.*
import join_patterns.examples.factory_simpl.runFactorySimple
import mainargs.Flag
import mainargs.ParserForClass
import mainargs.ParserForMethods
import mainargs.TokensReader
import mainargs.arg
import mainargs.main

object Main:
  implicit object MatchingAlgorithmParser extends TokensReader.Simple[MatchingAlgorithm]:
    def shortName: String = "algorithm"
    def read(tokens: Seq[String]) =
      tokens.headOption match
        case Some("brute")    => Right(BruteForceAlgorithm)
        case Some("stateful") => Right(StatefulTreeBasedAlgorithm)
        case _                => Left("Invalid algorithm")

  @main
  def boundedBuffer(
      @arg(short = 'b', doc = "The buffer bound")
      bufferBound: Int = 100,
      @arg(
        short = 'p',
        doc = "The maximum number of producers and consumers"
      )
      nProdsCons: Int = 50,
      @arg(doc = "The join pattern matching algorithm to use")
      algorithm: MatchingAlgorithm
  ) =
    val bbConfig = BBConfig(
      bufferBound = bufferBound,
      producers = nProdsCons,
      consumers = nProdsCons,
      cnt = bufferBound,
      algorithm = algorithm
    )
    runBB(bbConfig)

  @main
  def chameneos(
      @arg(short = 'm', doc = "The maximum number of meetings")
      maxNumberOfMeetings: Int = 100,
      @arg(
        short = 'c',
        doc = "The maximum number of chameneos"
      )
      nChameneos: Int = 50,
      @arg(doc = "The join pattern matching algorithm to use")
      algorithm: MatchingAlgorithm
  ) =
    val chameneosConfig = ChameneosConfig(
      maxNumberOfMeetings = maxNumberOfMeetings,
      numberOfChameneos = nChameneos,
      algorithm = algorithm
    )

    chameneosExample(
      chameneosConfig
    )

  @main
  def smartHouse(
      @arg(short = 'n', doc = "The number of messages to send")
      nMessages: Int = 100,
      @arg(short = 'a', doc = "The join pattern matching algorithm to use")
      algorithm: MatchingAlgorithm
  ) =
    val msgs = smartHouseMsgs(nMessages)(GenerateActions.genActionsOfSizeN)
    runSmartHouseExample(
      algorithm,
      msgs
    )

  @main
  def santaClaus(
      @arg(short = 'n', doc = "The number of deliveries to make")
      nDeliveries: Int = 100,
      @arg(short = 'a', doc = "The join pattern matching algorithm to use")
      algorithm: MatchingAlgorithm
  ) =
    santaClausExample(
      algorithm,
      nDeliveries
    )

  @main
  def printerSpooler(
      @arg(short = 'p', doc = "The number of printers")
      nPrinters: Int = 10,
      @arg(short = 'j', doc = "The number of jobs")
      nJobs: Int = 100,
      @arg(doc = "The join pattern matching algorithm to use")
      algorithm: MatchingAlgorithm
  ) =
    printerSpoolerExample(
      algorithm,
      nPrinters,
      nJobs
    )

  @main
  def factorySimple(
      @arg(doc = "The join pattern matching algorithm to use")
      algorithm: MatchingAlgorithm
  ) =
    runFactorySimple(algorithm)

  def main(args: Array[String]): Unit =
    ParserForMethods(this).runOrExit(args)

  @main
  def warehouseMonitor(
      @arg(doc = "The join pattern m@@atching algorithm to use")
      algorithm: MatchingAlgorithm
  ) =
    runFactorySimpleSocket(algorithm)

  def main(args: Array[String]): Unit =
    ParserForMethods(this).runOrExit(args)
```


#### Short summary: 

empty definition using pc, found symbol in pc: `<none>`.