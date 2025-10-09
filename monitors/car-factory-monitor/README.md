# Car factory monitor using the Join Actors library

## Usage
To run the Car factory monitor, you can use the following command:

```bash
sbt "run --algorithm while-lazy --port 9999 --host $(hostname -I | awk '{print $1}')"
```