# build scala monitor
FROM sbtscala/scala-sbt:eclipse-temurin-alpine-21.0.8_9_1.12.5_3.8.2 AS monitor_builder

WORKDIR /build

COPY docker/car-factory.build.sbt monitors/factory-monitor/build.sbt

COPY monitors/factory-monitor/project monitors/factory-monitor/project

COPY docker/assembly.sbt monitors/factory-monitor/project/assembly.sbt

COPY monitors/factory-monitor/lib monitors/factory-monitor/lib

# not necessary?
#RUN cd monitors/factory-monitor && sbt update

COPY monitors/factory-monitor/src monitors/factory-monitor/src

RUN cd monitors/factory-monitor && sbt assembly

# build typescript swarms
FROM node:slim AS swarm_builder

WORKDIR /build

RUN npm install -g typescript

COPY swarms/warehouse-factory swarms/factory

RUN cd swarms/factory && npm i && npm run build

FROM rust:alpine3.23 AS ax_builder

WORKDIR /build

# Install ax and its build dependencies

RUN apk add --no-cache gcc musl-dev libc-dev make protoc

RUN cargo install ax

# runtime
FROM alpine:3.23

RUN apk add --no-cache openjdk21-jre tmux nodejs musl-dev libc-dev protoc bash ncurses libevent

WORKDIR /app

COPY --from=monitor_builder /build/monitors/factory-monitor/target/scala-3.7.2/factory-monitor-assembly-0.1.jar monitors/factory-monitor.jar

COPY --from=ax_builder /usr/local/cargo/bin/ax /usr/local/bin/ax

COPY docker/split_and_run.sh swarms/split_and_run.sh

COPY docker/start_factory_forwarding.sh swarms/factory/start_factory_forwarding.sh

COPY docker/entrypoint.sh entrypoint.sh

RUN chmod +x swarms/factory/start_factory_forwarding.sh &&\
    chmod +x swarms/split_and_run.sh                    &&\
    chmod +x entrypoint.sh

ENV TERM=xterm-256color

COPY --from=swarm_builder /build/swarms/factory/dist swarms/factory/dist

COPY --from=swarm_builder /build/swarms/factory/node_modules swarms/factory/node_modules

ENTRYPOINT [ "./entrypoint.sh" ]