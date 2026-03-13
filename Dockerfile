# build
FROM sbtscala/scala-sbt:eclipse-temurin-alpine-21.0.8_9_1.12.5_3.8.2 AS builder

WORKDIR /build

COPY docker/car-factory.build.sbt monitors/factory-monitor/build.sbt

COPY monitors/factory-monitor/project monitors/factory-monitor/project

COPY docker/assembly.sbt monitors/factory-monitor/project/assembly.sbt

COPY monitors/factory-monitor/lib monitors/factory-monitor/lib

RUN cd monitors/factory-monitor && sbt update

COPY monitors/factory-monitor/src monitors/factory-monitor/src

RUN cd monitors/factory-monitor && sbt assembly

# runtime
FROM alpine:3.23

RUN apk add openjdk21-jre

WORKDIR /app

COPY --from=builder /build/monitors/factory-monitor/target/scala-3.7.2/factory-monitor-assembly-0.1.jar monitors/factory-monitor.jar
EXPOSE 9999/udp

CMD [ "java", "-jar", "monitors/factory-monitor.jar" ]