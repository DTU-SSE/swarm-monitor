#!/usr/bin/env bash

#bash split_and_run.sh a arr1 arr2 arr3 arr4 arr5 arr6 arr7 arr8 arr9 arr10

START_STEEL_TRANSPORT="npm run start-steel-transport; exec bash"
START_STAMP="npm run start-stamp; exec bash"
START_BODY_ASSEMBLER="npm run start-body-assembler; exec bash"
START_CAR_BODY_CHECKER="npm run start-car-body-checker; exec bash"
START_PAINTER="npm run start-painter; exec bash"
START_BASIC_TRANSPORT="npm run start-basic-transport; exec bash"
START_SMART_TRANSPORT="npm run start-smart-transport; exec bash"
START_BASE_STATION="npm run start-base-station; exec bash"
START_ENGINE_INSTALLER="npm run start-engine-installer; exec bash"
START_ENGINE_CHECKER="npm run start-engine-checker; exec bash"
START_WAREHOUSE="npm run start-warehouse; exec bash"
START_WHEEL_INSTALLER="npm run start-wheel-installer; exec bash"
START_WHEEL_CHECKER="npm run start-wheel-checker; exec bash"
START_WINDOW_INSTALLER="npm run start-window-installer; exec bash"
START_WINDOW_CHECKER="npm run start-window-checker; exec bash"
START_QUALITY_CONTROL="npm run start-quality-control; exec bash"

bash split_and_run.sh $1 "$START_STEEL_TRANSPORT" "$START_STAMP" "$START_BODY_ASSEMBLER" \
    "$START_CAR_BODY_CHECKER" "$START_PAINTER" "$START_BASIC_TRANSPORT" "$START_SMART_TRANSPORT" \
    "$START_BASIC_TRANSPORT" "$START_SMART_TRANSPORT" "$START_BASE_STATION" "$START_ENGINE_INSTALLER" \
    "$START_WAREHOUSE" "$START_ENGINE_CHECKER" "$START_WHEEL_INSTALLER" "$START_WHEEL_INSTALLER" \
    "$START_WHEEL_INSTALLER" "$START_WHEEL_CHECKER" "$START_WINDOW_INSTALLER" "$START_WINDOW_INSTALLER" \
    "$START_WINDOW_INSTALLER" "$START_WINDOW_CHECKER" "$START_QUALITY_CONTROL"

#"$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_BODY_ASSEMBLER" "$START_BODY_ASSEMBLER" "$START_PAINTER" "$START_PAINTER" "$START_PAINTER"


#"$START_BODY_ASSEMBLER" "$START_BODY_ASSEMBLER" "$START_BODY_ASSEMBLER" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_BODY_ASSEMBLER" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_BODY_ASSEMBLER" "$START_BODY_ASSEMBLER" "$START_BODY_ASSEMBLER" "$START_BODY_ASSEMBLER" "$START_BODY_ASSEMBLER" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_STAMP" "$START_BODY_ASSEMBLER"