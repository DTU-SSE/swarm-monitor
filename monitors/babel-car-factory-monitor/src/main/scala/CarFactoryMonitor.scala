import join_actors.api.*
import car_factory_messages.car_factory.*

// Match actyx events against join patterns
def monitor(algorithm: MatchingAlgorithm) =
  Actor[Event, Unit] {
    receive { (self: ActorRef[Event]) =>
      {
        case SteelRoll(meta, _, _) =>
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: SteelRoll(...)${Console.RESET}\n"
          )
          Continue
        case SteelParts(part, meta, _, _) =>
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: SteelParts(part = $part, ...)${Console.RESET}\n"
          )
          Continue
        case CarBody(shape1, meta1, lbj1, _)
            &:& PaintedCarBody(shape2, color2, meta2, lbj2, _)
            if shape1 == shape2 =>
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: CarBody(shape = $shape1, ...), PaintedCarBody(shape = $shape2, color = $color2, ...)${Console.RESET}\n"
          )
          Continue
        case FinishedCar(_, _, _, _, _, _, meta, _, _) =>
          println(
            s"${Console.RED}${Console.UNDERLINED}Matched messages: FinishedCar(...)${Console.RESET}\n"
          )
          println(
            s"${Console.RED}${Console.UNDERLINED}Shutting down monitor actor...${Console.RESET}"
          )
          Stop(())
      }
    }(algorithm)
  }

def printMetaInner(meta: Option[Meta]) = meta match
  case Some(value) =>
    println(
      s"Offset: ${value.offset} Timestamp: ${value.lamport}. eventID: ${value.eventId}"
    )
  case None => ()
