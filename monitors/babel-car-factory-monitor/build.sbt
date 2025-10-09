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

    resolvers ++= Seq(
      "novasys-mvn" at "https://novasys.di.fct.unl.pt/packages/mvn"
    ),

    scalacOptions ++= Seq("-feature"),
    libraryDependencies += "com.lihaoyi"                  %% "mainargs"           % mainargsVersion,
    libraryDependencies += "org.scalatest"                %% "scalatest"          % scalaTestVersion % Test,
    libraryDependencies += "org.scalatest"                %% "scalatest-funsuite" % scalaTestVersion % Test,
    libraryDependencies += "pt.unl.fct.di.novasys.babel"  %  "babel-core"         % "[1.0.0,)",
    libraryDependencies += "pt.unl.fct.di.novasys"        %  "network-layer"      % "2.0.43",
    libraryDependencies += "org.apache.logging.log4j"     %  "log4j-core"         % "2.25.2",
    libraryDependencies += "io.netty"                     %  "netty-buffer"       % "4.2.6.Final"
)
