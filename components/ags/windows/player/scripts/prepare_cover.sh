#!/usr/bin/bash

size=$2

if [ -f /tmp/prev_bg.png ]; then
    if cmp -s "$1" /tmp/prev_bg.png; then
        echo "Image is the same"
        exit 0
    fi
fi

echo $1
echo $2

cp "$1" "/tmp/prev_bg.png"

echo "Image is different"

cp "$1" "/tmp/bg.png"

if [ -z "$size" ]; then
    size=40
fi

# # grayscale
# convert /tmp/bg.png -colorspace Gray /tmp/bg.png

#remove bars
magick mogrify -fuzz 4% -trim +repage -shave 7x7 -format png /tmp/bg.png

magick mogrify -resize "$size"x"$size"^ -gravity center -extent "$size"x"$size" -format png /tmp/bg.png




