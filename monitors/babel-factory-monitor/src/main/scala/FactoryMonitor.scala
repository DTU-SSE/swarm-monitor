import join_actors.api.*
import myPackage.factory.*

// Match actyx events against join patterns
def monitor(algorithm: MatchingAlgorithm) =
  Actor[Event, Unit] {
    receive { (self: ActorRef[Event]) =>
      {
        case PartRequest(part1, meta1, lbj1, _)
             &:& Position(position, part2, meta2, lbj2, _)
             &:& PartOK( part3, meta3, lbj3, _) => //if part1 == part2 && part2 == part3 =>
          println(
            s"========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 01${Console.RESET} =========================\n"
          )
          println(
            s"${Console.BLUE}${Console.UNDERLINED}Matched messages: PartRequest(id = $part1, ...), Position(position = $position, id = $part2, ...), PartOK(id = $part3, ...)${Console.RESET}\n"
          )
          println(
            s"\n========================= ${Console.BLUE}${Console.UNDERLINED}Join Pattern 01${Console.RESET} ========================="
          )
          Continue
        case PartRequest(part1, meta1, lbj1, _)
             &:& Position(position, part2, meta2, lbj2, _)
             &:& PartOK(part3, meta3, lbj3, _) if part2 == "broken part" && part2 == part3 && lbj2 == lbj3 =>
          println(
            s"========================= ${Console.YELLOW}${Console.UNDERLINED}Join Pattern 02${Console.RESET} =========================\n"
          )
          println(
            s"${Console.YELLOW}${Console.UNDERLINED}Matched messages: PartRequest(id = $part1, ...), PartRequest(position = $position, id = $part2, ...), PartOK(id = $part3, ...)${Console.RESET}\n"
          )
          println(
            s"\n========================= ${Console.YELLOW}${Console.UNDERLINED}Join Pattern 02${Console.RESET} ========================="
          )
          Continue
        case Car(partName, modelName, meta, lbj, _) =>
          println(
            s"========================= ${Console.GREEN}${Console.UNDERLINED}Join Pattern 03${Console.RESET} =========================\n"
          )
          println(
            s"${Console.GREEN}${Console.UNDERLINED}Matched messages: Car(partName = $partName, modelName= $modelName)${Console.RESET}\n"
          )
          println(
            s"\n========================= ${Console.GREEN}${Console.UNDERLINED}Join Pattern 03${Console.RESET} ========================="
          )
          Continue
        case ClosingTime(time, meta, lbj, _) =>
          println(
            s"========================= ${Console.RED}${Console.UNDERLINED}Join Pattern 04${Console.RED} =========================\n"
          )
          println(
            s"${Console.RED}${Console.UNDERLINED}Matched messages: ClosingTime(timeOfDay = $time, ...)${Console.RESET}\n"
          )
          println(
            s"${Console.RED}${Console.UNDERLINED}Shutting down monitor actor...${Console.RESET}"
          )
          println(
            s"========================= ${Console.RED}${Console.UNDERLINED}Join Pattern 04${Console.RED} =========================\n"
          )
          Stop(())
      }
    }(algorithm)
  }

def printMeta(meta: Option[Meta]) = meta match
  case Some(value) =>
    println(
      s"Offset: ${value.offset} Timestamp: ${value.lamport}. eventID: ${value.eventId}"
    )
  case None => ()
