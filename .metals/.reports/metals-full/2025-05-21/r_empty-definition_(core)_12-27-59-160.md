error id: file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala:
file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:

offset: 1584
uri: file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala
text:
```scala
package join_patterns.examples.factory_simple_socket_types

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonObject
import org.scalacheck.*

import scala.util.*
import io.circe.Codec
import io.circe.derivation.Configuration

//sealed trait Event derives io.circe.Codec

/* enum ForkliftEvent:
  case Fault(faultID: Int, ts: Long)
  case Pos(position: String, part: String)

enum TransporterEvent:
    case PartReq(id: String)
    case PartOK(part: String)

enum DoorEvent:
    case ClosingTime(timeOfDay: String)

enum FactoryRobotEvent:
    case Car(part: String, modelName: String)

enum WorkerEvent:
  case Fix(faultID: Int, ts: Long)

enum SystemEvent:
  case DelayedFault(faultID: Int, ts: Long)
  case Shutdown()

type Event = ForkliftEvent | TransporterEvent | DoorEvent | FactoryRobotEvent | WorkerEvent | SystemEvent */

enum EventTypes:
  case Pos(position: String, part: String)
  case PartOK(part: String)

type Event = EventTypes
/* object Event {
  given Configuration = Configuration.default
    .withDiscriminator()
} */

/* object ActionToJsonFormatter:
  val gson = GsonBuilder().setDateFormat("MMM dd, yyyy, hh:mm:ss a").setPrettyPrinting().create()

  def toJson(obj: Any): String =
    assert(obj != null, "Object to be converted to JSON cannot be null")

    val jsonObj: JsonObject = JsonObject()

    jsonObj.addProperty("type", obj.getClass.getSimpleName)
    jsonObj.add("data", gson.toJsonTree(obj))
    gson.toJson(jsonObj)

  def fromJson[T](json: String, typeOfT: T): Any =
    assert(json != null, "JSON string c@@annot be null")

    val jsonObj = gson.fromJson(json, classOf[JsonObject])
    gson.fromJson(jsonObj.get("data"), typeOfT.getClass) */
```


#### Short summary: 

empty definition using pc, found symbol in pc: 