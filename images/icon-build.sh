#!/bin/bash

cd "$(dirname "$0")"

for SIZE in 48 96
do
    convert -resize ${SIZE}x -background none icon.svg icon-tmp.png
    pngcrush icon-tmp.png icon-$SIZE.png
    "rm" icon-tmp.png
done
