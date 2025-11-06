###  Run N machines and generate traffic


To run N machines silently run `spawner_silent_multiple_machines_per_process.ts`. To do so invoke `npm run start-spawner-silent-multiple-per-process -- -n [number of machines] -c [a or b. a uses async.queue with 8 workers b uses Promise.all]`.

ax has to be running. So in another terminal run `ax run` *before* starting the machines.

To check that N machines were in fact started run ax run 2> err and start the machines. Then, once the machines have finished, run `grep "Successfully authenticated and authorized com.example.car-factory for trial usage" err | wc -l`.

Also: you can check various things with [AQL queries](https://developer.actyx.com/docs/tutorials/aql). E.g. `ax events query localhost "FROM appId(com.example.car-factory)"`


npm run start-spawner-silent-multiple-per-process -- -n 500 -c b
make sure ax is running 
