#!/bin/bash
# Klonlangan ovozni tozalash: past/yuqori chastota filtri, shitirlashni kamaytirish (FFT), sukunatlarda darvoza, yumshoq de-esser
ffmpeg -loglevel error -y -i "$1" -af "highpass=f=75,lowpass=f=10000,afftdn=nr=18:nf=-42:tn=1,agate=threshold=0.02:ratio=4:range=0.06:attack=4:release=150,deesser=i=0.3,equalizer=f=3000:t=q:w=1.2:g=1.5" -ar 44100 "$2"
