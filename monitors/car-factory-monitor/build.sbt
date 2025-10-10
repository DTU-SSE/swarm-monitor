ThisBuild / version      := "0.1"
ThisBuild / scalaVersion := "3.7.2"

lazy val scalaTestVersion     = "3.2.19"
lazy val mainargsVersion      = "0.7.6"

lazy val root = project
  .in(file("."))
  .settings(
    name := "car-factory-monitor",

    Compile / PB.targets := Seq(
        scalapb.gen() -> (Compile / sourceManaged).value / "scalapb"
    ),

    scalacOptions ++= Seq("-feature"),
    libraryDependencies += "com.lihaoyi"         %% "mainargs"           % mainargsVersion,
    libraryDependencies += "org.scalatest"       %% "scalatest"          % scalaTestVersion % Test,
    libraryDependencies += "org.scalatest"       %% "scalatest-funsuite" % scalaTestVersion % Test
)
