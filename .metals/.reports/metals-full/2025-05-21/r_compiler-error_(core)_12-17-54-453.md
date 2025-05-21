file://<WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala
### dotty.tools.dotc.core.TypeError$$anon$1: Toplevel definition Event is defined in
  <WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala
and also in
  <WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala
One of these files should be removed from the classpath.

occurred in the presentation compiler.

presentation compiler configuration:


action parameters:
offset: 877
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

enum E@@

object Event {
  given Configuration = Configuration.default
    .withDiscriminator()
}

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
    gson.fromJson(jsonObj.get("data"), typeOfT.getClass)
```



#### Error stacktrace:

```

```
#### Short summary: 

dotty.tools.dotc.core.TypeError$$anon$1: Toplevel definition Event is defined in
  <WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala
and also in
  <WORKSPACE>/join-actors/core/src/main/scala/examples/FactorySimpleSocketTypes.scala
One of these files should be removed from the classpath.