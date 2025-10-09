package utils;

import org.apache.logging.log4j.LogManager
import org.apache.logging.log4j.Logger
import pt.unl.fct.di.novasys.network.data.Host
import scala.collection.JavaConverters.enumerationAsScalaIteratorConverter

import java.net.*;
import java.util.Enumeration;

object NetworkingUtilities:
  private val logger: Logger = LogManager.getLogger(getClass)

  /** Returns the ipv4 address of the given interface
    * @param interface
    *   name of the interface
    * @return
    *   ipv4 address of the interface
    */
  def getAddress(interface: String): Option[String] =
    Option(NetworkInterface.getByName(interface)) match
      case None =>
        logger.error(s"No interface named ${interface}")
        None
      case Some(byName) =>
        val addresses = byName.getInetAddresses.asScala
        addresses.collectFirst { case address: Inet4Address =>
          address.getHostAddress
        } match
          case some @ Some(_) => some
          case None =>
            logger.error(s"No IPv4 found for interface ${interface}")
            None

  def parseHost(s: String): Either[Exception, Host] =
    s.split(":") match
      case Array(host, port) =>
        try Right(Host(InetAddress.getByName(host), port.toInt))
        catch case e: Exception => Left(e)
      case _ =>
        Left(new IllegalArgumentException(s"Invalid argument ${s}"))
