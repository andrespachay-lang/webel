#!/usr/bin/env python3
"""Sintetiza la banda sonora del video (música, rotor del helicóptero y efectos).

Todo es procedural y determinista (semilla fija), sin samples externos.
Uso:  python3 tools/make_audio.py   -> escribe assets/audio/{music,heli,sfx}.wav
Los tiempos están en segundos globales y siguen el timeline de index.html.
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
DUR = 55.0
N = int(SR * DUR)
rng = np.random.default_rng(2026)
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")


# ---------------------------------------------------------------- helpers
def t_arr(d):
    return np.arange(int(SR * d)) / SR


def stereo():
    return np.zeros((N, 2))


def place(buf, sig, at, gain=1.0, pan=0.0):
    """Mezcla `sig` (mono o estéreo) en `buf` a partir de `at` segundos."""
    i = int(at * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if sig.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], axis=1)
    j0 = max(0, -i)
    i0 = max(0, i)
    n = min(len(sig) - j0, N - i0)
    buf[i0 : i0 + n] += sig[j0 : j0 + n] * gain


def fft_filter(x, lo=None, hi=None):
    """Filtro de banda en dominio de frecuencia con flancos suaves."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def noise(d):
    return rng.standard_normal(int(SR * d))


def env_ad(n, a, d_curve):
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    return att * np.exp(-t * d_curve)


def norm(x, peak=1.0):
    m = np.max(np.abs(x))
    return x if m == 0 else x / m * peak


def sweep_filter(x, f0, f1, q=2.0):
    """Pasa-banda (state-variable) con centro barriendo de f0 a f1."""
    n = len(x)
    fc = np.geomspace(f0, f1, n)
    g = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
    low = band = 0.0
    y = np.empty(n)
    damp = 1 / q
    for i in range(n):
        high = x[i] - low - damp * band
        band += g[i] * high
        low += g[i] * band
        y[i] = band
    return y


# ---------------------------------------------------------------- SFX
def whoosh(d=0.6, f0=300, f1=3000, rise=0.6):
    x = sweep_filter(noise(d), f0, f1, q=1.6)
    t = t_arr(d)
    e = np.where(t < d * rise, (t / (d * rise)) ** 2, np.exp(-(t - d * rise) * 9))
    return norm(x * e, 0.9)


def pop(freq=900, d=0.09):
    t = t_arr(d)
    f = freq * (1 + 0.8 * np.exp(-t * 60))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45)
    return s * 0.8


def impact(d=0.9, low=48):
    t = t_arr(d)
    f = low + 120 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    crack = fft_filter(noise(d), 800, 6000) * np.exp(-t * 30) * 0.5
    return norm(np.tanh((body + crack) * 1.8), 1.0)


def swipe(d=0.35):  # tachón / marcador
    x = fft_filter(noise(d), 1500, 7000)
    t = t_arr(d)
    return norm(x * np.sin(np.pi * t / d) ** 0.5 * (1 + 0.5 * np.sin(2 * np.pi * 38 * t)), 0.7)


def click(freq=3000, d=0.03):
    t = t_arr(d)
    return (fft_filter(noise(d), freq * 0.6, freq * 1.6) * np.exp(-t * 220)) * 1.2


def type_key():
    a = click(2600, 0.04)
    b = np.concatenate([np.zeros(int(SR * 0.012)), pop(180, 0.04) * 0.4])
    n = max(len(a), len(b))
    return np.pad(a, (0, n - len(a))) + np.pad(b, (0, n - len(b)))


def beep(freq=1400, d=0.12):
    t = t_arr(d)
    return np.sin(2 * np.pi * freq * t) * env_ad(len(t), 0.004, 25) * 0.6


def chime(freqs=(1318.5, 1760, 2637), d=1.4):
    t = t_arr(d)
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (3 + k * 1.5)) for k, f in enumerate(freqs))
    return norm(s * env_ad(len(t), 0.003, 0), 0.6)


def sparkle(d=0.8, seed=1):
    r = np.random.default_rng(seed)
    out = np.zeros(int(SR * d))
    for k in range(9):
        f = r.uniform(2500, 6000)
        tt = t_arr(0.25)
        s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 22) * 0.35
        i = int(r.uniform(0, d - 0.25) * SR)
        out[i : i + len(s)] += s
    return out


def boing(d=0.5, f0=220, f1=520):
    t = t_arr(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 14)) + 25 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.7


def thud(d=0.35):
    t = t_arr(d)
    f = 55 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)


def riser(d=3.4):
    x = sweep_filter(noise(d), 200, 6000, q=3)
    t = t_arr(d)
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(110, 880, len(t))) / SR) * 0.25
    return norm((x + tone) * (t / d) ** 2.2, 0.9)


def wind(d):
    x = sweep_filter(noise(d), 400, 900, q=1.2)
    t = t_arr(d)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t)
    fade = np.minimum(1, np.minimum(t / 0.5, (d - t) / 0.6))
    return norm(x * lfo * fade, 0.6)


def waves(d):
    x = fft_filter(noise(d), 150, 2500)
    t = t_arr(d)
    swell = (0.35 + 0.65 * np.sin(np.pi * ((t / 2.2) % 1)) ** 2)
    fade = np.clip(np.minimum(t / 0.4, (d - t) / 0.5), 0, 1)
    return norm(x * swell * fade, 0.5)


def cash_tick():
    return click(5000, 0.02) * 0.6


# ---------------------------------------------------------------- helicóptero
def rotor(d, rate=11.5, rate_end=None, pan0=0.0, pan1=0.0, fade_in=0.4, fade_out=0.5, dist=None):
    """Rotor: pulsos de aire filtrado + golpe grave + silbido de turbina."""
    t = t_arr(d)
    rate_end = rate if rate_end is None else rate_end
    rt = np.linspace(rate, rate_end, len(t))
    phase = np.cumsum(rt) / SR
    frac = phase % 1.0
    pulse = np.exp(-frac * 9.0)
    air = fft_filter(noise(d), 70, 900) * pulse
    thump = np.sin(2 * np.pi * 62 * t) * np.exp(-frac * 14) * 0.9
    whine = np.sin(2 * np.pi * (2900 + 60 * np.sin(2 * np.pi * 0.3 * t)) * t) * 0.025
    sig = norm(air + thump, 0.9) + whine
    amp = np.clip(np.minimum(t / fade_in, (d - t) / fade_out), 0, 1)
    if dist is not None:  # curva de cercanía (0..1)
        amp *= np.interp(t, np.linspace(0, d, len(dist)), dist)
    sig *= amp
    pan = np.linspace(pan0, pan1, len(t))
    l = np.cos((pan + 1) * np.pi / 4) * 1.414
    r = np.sin((pan + 1) * np.pi / 4) * 1.414
    return np.stack([sig * l, sig * r], axis=1)


# ---------------------------------------------------------------- música
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
# A menor tropical: Am - F - C - G
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
ROOTS = [45, 41, 48, 43]


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


def kick():
    t = t_arr(0.35)
    f = 45 + 110 * np.exp(-t * 35)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 2.2)


def clap():
    d = 0.25
    t = t_arr(d)
    x = fft_filter(noise(d), 900, 5000)
    e = np.zeros_like(t)
    for off in (0, 0.012, 0.024):
        e += np.where(t >= off, np.exp(-(t - off) * 70), 0)
    e += np.exp(-t * 18) * 0.4
    return norm(x * e, 0.7)


def hat(open_=False):
    d = 0.18 if open_ else 0.05
    t = t_arr(d)
    return fft_filter(noise(d), 7000, 15000) * np.exp(-t * (18 if open_ else 90)) * 0.5


def pluck(m, d=0.45):
    t = t_arr(d)
    f = mtof(m)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 30)
         + 0.2 * np.sin(2 * np.pi * 2 * f * t))
    return s * env_ad(len(t), 0.003, 9) * 0.35


def bass(m, d):
    t = t_arr(d)
    f = mtof(m)
    s = np.tanh(1.6 * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)))
    return s * env_ad(len(t), 0.005, 2.5) * np.clip((d - t) / 0.03, 0, 1) * 0.5


def pad(ch, d):
    t = t_arr(d)
    s = np.zeros_like(t)
    for m in ch:
        for det in (-0.08, 0.0, 0.08):
            f = mtof(m + 12) * 2 ** (det / 12)
            s += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28))
    s = fft_filter(s, 150, 2500)
    fade = np.clip(np.minimum(t / 0.6, (d - t) / 0.6), 0, 1)
    return norm(s, 0.25) * fade


def build_music():
    mus = stereo()
    nbars = int(np.ceil(DUR / BAR))
    k, c, h, ho = kick(), clap(), hat(), hat(True)
    for b in range(nbars):
        t0 = b * BAR
        ci = b % 4
        intro = t0 < 4.0
        breakdown = 30.5 <= t0 < 34.0 or (t0 < 34 and t0 + BAR > 30.5)
        outro = t0 >= 52.0
        # pad siempre
        place(mus, pad(CHORDS[ci], BAR + 0.3), t0, 0.55 if not breakdown else 0.8)
        for beat in range(4):
            tb = t0 + beat * BEAT
            if 30.5 <= tb < 34.0:
                continue  # silencio rítmico en "no termina aquí"
            if tb >= 54.0:
                continue
            if not intro:
                place(mus, k, tb, 0.85)
                if beat in (1, 3):
                    place(mus, c, tb, 0.45, pan=0.1)
            place(mus, h, tb + BEAT / 2, 0.35, pan=0.35)
            if beat % 2 == 1:
                place(mus, ho, tb + BEAT / 2, 0.15, pan=-0.3)
            # bajo con síncopa reggaetonera ligera (3-3-2)
            if not intro:
                for off, ln in ((0, 0.75), (0.75, 0.75), (1.5, 0.5)):
                    if beat % 2 == 0:
                        place(mus, bass(ROOTS[ci], ln * BEAT * 0.95), tb + off * BEAT, 0.55)
            # plucks: arpegio en semicorcheas sincopadas
            notes = CHORDS[ci] + (CHORDS[ci][0] + 12,)
            pattern = [0, 2, 1, 3] if b % 2 == 0 else [3, 1, 2, 0]
            for s, step in enumerate((0, 0.75, 1.5, 2.5)):
                if beat % 2 == 0:
                    place(mus, pluck(notes[pattern[s]] + 12), tb + step * BEAT / 2, 0.5, pan=-0.25 + 0.5 * (s % 2))
    # golpe final y caída
    place(mus, impact(1.6, 40), 54.0, 0.6)
    place(mus, pad(CHORDS[0], 1.0), 54.0, 0.6)
    # riser a la sección de Olón
    place(mus, riser(3.3), 30.7, 0.45)
    place(mus, impact(1.2), 34.0, 0.75)
    # fade de salida
    tt = np.arange(N) / SR
    mus *= np.clip((DUR - tt) / 0.6, 0, 1)[:, None]
    return mus


# ---------------------------------------------------------------- pista de efectos
def build_sfx():
    fx = stereo()
    P = lambda sig, at, g=1.0, pan=0.0: place(fx, sig, at, g, pan)

    # S1
    P(whoosh(0.4, 600, 2500), 0.05, 0.35)
    for i in range(4):
        P(pop(700 + i * 90), 0.38 + i * 0.06, 0.45, -0.3 + i * 0.2)
    for i in range(6):
        P(pop(1100 + i * 70, 0.07), 0.82 + i * 0.04, 0.35, -0.4 + i * 0.16)
    P(whoosh(0.35, 800, 3500), 1.18, 0.35, 0.4)
    P(swipe(0.38), 1.95, 0.7, -0.2)
    P(boing(0.4, 160, 120), 2.3, 0.35)
    P(whoosh(0.8, 2500, 300, rise=0.3), 2.85, 0.45)
    P(thud(), 3.55, 0.4)
    P(whoosh(0.45, 400, 4000), 3.3, 0.5)
    # S2
    P(whoosh(0.6, 300, 2500), 3.95, 0.5)
    for i in range(10):
        P(pop(600 + i * 60, 0.08), 4.5 + i * 0.04, 0.3, -0.5 + i * 0.1)
    P(impact(0.8), 5.05, 0.4)
    P(whoosh(0.9, 500, 4500), 6.9, 0.5, 0.6)
    P(whoosh(0.4, 3000, 600), 7.5, 0.35, -0.5)
    # S3
    for i in range(3):
        P(whoosh(0.35, 700, 3000), 7.95 + i * 0.1, 0.3, -0.6 + i * 0.6)
    P(sparkle(0.6, 3), 8.35, 0.5)
    P(whoosh(0.3, 400, 1500), 8.45, 0.35, -0.3)
    P(thud(0.3), 8.95, 0.3, -0.3)
    P(pop(1200), 8.85, 0.5)
    P(whoosh(0.3, 400, 1500), 8.95, 0.35, 0.3)
    P(thud(0.3), 9.45, 0.3, 0.3)
    for i in range(10):
        P(pop(500 + i * 40, 0.07), 9.5 + i * 0.035, 0.25)
    P(swipe(0.6), 10.1, 0.4, 0.2)
    P(whoosh(0.5, 3500, 400, rise=0.3), 12.1, 0.4)
    # S4
    P(whoosh(0.8, 200, 2500), 12.3, 0.45)
    for i in range(10):
        P(pop(800 + i * 30, 0.07), 12.95 + i * 0.04, 0.25)
    for at, f, pan in ((13.7, 1500, 0.4), (14.7, 1800, -0.1), (15.5, 2100, -0.1)):
        P(beep(f, 0.15), at, 0.45, pan)
    P(whoosh(0.5, 4000, 500, rise=0.2), 17.45, 0.4)
    # S5
    P(whoosh(0.6, 300, 3000), 17.9, 0.4)
    for i in range(12):
        P(thud(0.25), 18.2 + i * 0.06, 0.12, -0.8 + i * 0.14)
    P(sparkle(1.0, 5), 19.0, 0.45, -0.6)
    for i in range(8):
        P(pop(900 + i * 50, 0.07), 18.7 + i * 0.04, 0.25)
    # S6
    P(whoosh(0.7, 3500, 400, rise=0.15), 22.45, 0.45)
    for at in (23.3, 23.9, 24.4):
        P(beep(1200, 0.08), at, 0.35)
    P(beep(1900, 0.09), 24.85, 0.45)
    P(beep(1900, 0.09), 24.97, 0.45)
    for i in range(14):
        P(pop(700 + i * 40, 0.07), 23.1 + i * 0.03, 0.25)
    P(whoosh(0.3, 3000, 800), 24.65, 0.3)
    P(boing(0.5, 300, 160), 25.0, 0.4)
    P(thud(0.3), 25.12, 0.5)
    P(thud(0.2), 25.3, 0.25)
    # S7
    P(wind(4.0), 26.5, 0.55)
    for i in range(5):
        P(whoosh(0.45, 300, 1600), 26.65 + i * 0.22, 0.22, -0.4 + i * 0.2)
    P(chime(), 27.55, 0.55)
    P(sparkle(0.9, 8), 27.6, 0.4, 0.2)
    # S8 máquina de escribir
    for i in range(8):
        P(type_key(), 30.65 + i * 0.1, 0.55, -0.2 + 0.05 * i)
    for i in range(16):
        P(type_key(), 31.6 + i * 0.05, 0.4, -0.4 + 0.05 * i)
    P(beep(1100, 0.05), 32.8, 0.15)
    P(whoosh(0.4, 500, 5000), 33.4, 0.5)
    # S9
    P(whoosh(0.6, 3000, 300, rise=0.2), 34.0, 0.4)
    P(thud(0.4), 34.45, 0.45)
    P(boing(0.6, 280, 660), 34.9, 0.4, 0.3)
    P(pop(900), 34.8, 0.4, 0.4)
    for i in range(53):  # ticks del contador de km
        P(cash_tick(), 35.2 + 4.0 * (i / 53) ** 1.0, 0.25, 0.1)
    P(chime((1046.5, 1568, 2093)), 39.1, 0.6, -0.4)
    P(beep(1600, 0.1), 39.3, 0.2, -0.4)
    P(whoosh(0.6, 400, 4000), 40.35, 0.5)
    # S10
    P(waves(4.0), 41.0, 0.55)
    for i in range(5):
        P(pop(500 + i * 60, 0.08), 41.45 + i * 0.05, 0.35)
    P(swipe(0.32), 42.2, 0.6)
    P(whoosh(0.4, 2500, 500, rise=0.2), 42.55, 0.3)
    P(pop(1300, 0.1), 42.7, 0.4)
    P(whoosh(0.6, 300, 4000), 42.9, 0.5)
    P(sparkle(0.8, 11), 43.4, 0.45)
    P(whoosh(0.45, 3500, 300, rise=0.2), 44.55, 0.45)
    # S11
    P(waves(4.0), 45.0, 0.45)
    P(whoosh(0.5, 400, 3000), 45.25, 0.35, 0.5)
    for i in range(10):
        P(pop(600 + i * 45, 0.07), 46.2 + i * 0.04, 0.25)
    # S12
    P(whoosh(0.5, 300, 3000), 48.95, 0.45)
    P(impact(0.7), 49.45, 0.45)
    P(boing(0.6, 200, 600), 50.3, 0.45)
    P(whoosh(0.5, 600, 2000), 51.4, 0.25, 0.5)
    P(click(2500, 0.03), 52.05, 1.0, 0.3)
    P(pop(1500, 0.08), 52.06, 0.5, 0.3)
    P(sparkle(0.7, 13), 52.1, 0.4)
    return fx


def build_heli():
    hb = stereo()
    # S2: entra desde la izquierda, se queda, sale arriba-derecha
    hb_s2 = rotor(3.95, 12, 12.5, -0.9, 0.9, fade_in=0.6, fade_out=0.5, dist=[0.3, 1, 1, 1, 1, 0.9, 0.3])
    place(hb, hb_s2, 4.05, 0.75)
    # S4: vista aérea sobre el río (más constante, levemente lejano)
    place(hb, rotor(5.5, 11.8, fade_in=0.5, fade_out=0.6), 12.5, 0.55)
    # S5: cruza de izquierda a derecha
    place(hb, rotor(4.3, 12.3, 11.6, -0.9, 0.9, dist=[0.4, 0.8, 1, 0.8, 0.4]), 18.2, 0.5)
    # S9: vuelo hacia Olón
    place(hb, rotor(4.6, 11.5, 12.2, 0.4, -0.5, fade_in=0.5, fade_out=0.8), 34.9, 0.45)
    # S11: cruza de derecha a izquierda
    place(hb, rotor(3.8, 12.3, 11.6, 0.9, -0.9, dist=[0.4, 0.8, 1, 0.8, 0.4]), 45.2, 0.45)
    # S12: aparece y despega (sube el ritmo del rotor)
    place(hb, rotor(2.7, 11.5, 15.0, 0.0, 0.3, fade_in=0.3, fade_out=1.4), 52.3, 0.7)
    return hb


def write_wav(path, buf, peak=0.89):
    buf = buf / max(np.max(np.abs(buf)), 1e-9) * peak
    data = (np.clip(buf, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, build in (("music", build_music), ("sfx", build_sfx), ("heli", build_heli)):
        wav = os.path.join(OUT, name + ".wav")
        write_wav(wav, build())
        subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", wav,
                        "-c:a", "libmp3lame", "-b:a", "256k", wav[:-4] + ".mp3"], check=True)
        os.remove(wav)
    print("ok")
