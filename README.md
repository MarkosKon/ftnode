# Font tools node

A script that runs a list of font files through `varLib.instancer` and/or `pyftsubset`. `varLib.instancer` and `pyftsubset` are part of the python package `fonttools`, and for this script to work, you need to install them with `pip install fonttools Brotli` (Brotli is required by the fontttools).

I'm also using `zx` to simplify child processes with Node, so you'll need to install it with `npm i -g zx`.

## How to run

- Clone the repo `git clone https://github.com/MarkosKon/ftnode.git`
- Change the directory `cd ftnode`.
- Run the executable with `./src/ftnode.mjs --wght 400:700 Literata[opsz,wght].ttf`.
- Or install it globally with `npm link` and then run it with `ftnode --wght 400:700 Literata[opsz,wght].ttf`.

## How to use

See the [the help menu generated by yargs](help.txt) or run the program with the `--help` option.
