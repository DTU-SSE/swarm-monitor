error id: file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala:[310..314) in Input.VirtualFile("file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala", "package join_patterns.examples.factory_simple_socket_types

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonObject
import org.scalacheck.*

import scala.util.*

enum ForkliftEvent:
  case Fault(faultID: Int, ts: Long)
  case Pos(position: String, part: String)

enum

enum WorkerEvent:
  case Fix(faultID: Int, ts: Long)

enum SystemEvent:
  case DelayedFault(faultID: Int, ts: Long)
  case Shutdown()

type Event = MachineEvent | WorkerEvent | SystemEvent

object ActionToJsonFormatter:
  val gson = GsonBuilder().setDateFormat("MMM dd, yyyy, hh:mm:ss a").setPrettyPrinting().create()

  def toJson(obj: Any): String =
    assert(obj != null, "Object to be converted to JSON cannot be null")

    val jsonObj: JsonObject = JsonObject()

    jsonObj.addProperty("type", obj.getClass.getSimpleName)
    jsonObj.add("data", gson.toJsonTree(obj))
    gson.toJson(jsonObj)

  def fromJson[T](json: String, typeOfT: T): Any =
    assert(json != null, "JSON string cannot be null")

    val jsonObj = gson.fromJson(json, classOf[JsonObject])
    gson.fromJson(jsonObj.get("data"), typeOfT.getClass)")
file://<WORKSPACE>/file:<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala
file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala:16: error: expected identifier; obtained enum
enum WorkerEvent:
^
#### Short summary: 

expected identifier; obtained enum