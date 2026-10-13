"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { PLAYLIST, ytMusicUrl } from "@/lib/music";
import { HERO_PHOTO } from "@/lib/photos";

/* ── YouTube IFrame API (dimuat hanya saat player pertama kali dibuka) ── */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApi: Promise<YTNamespace> | null = null;

function loadYouTubeApi() {
  ytApi ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    // youtube.com diblokir jaringan / ad blocker: tampilkan pesan, jangan kotak hitam.
    script.onerror = () => {
      reject(new Error("YouTube API gagal dimuat"));
    };
    document.head.appendChild(script);
  });
  return ytApi;
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

const fmt = (s: number) =>
  Number.isFinite(s) && s > 0
    ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
    : "0:00";

// Piringan hitam dengan foto Ranran di tengah, berputar saat lagu diputar.
function Disc({ playing, size }: { playing: boolean; size: string }) {
  return (
    <motion.span
      className={`relative block shrink-0 rounded-full bg-[repeating-radial-gradient(circle,#18181b_0_2px,#27272a_2px_4px)] shadow-lg ${size}`}
      animate={{ rotate: playing ? 360 : 0 }}
      transition={playing ? { duration: 6, repeat: Infinity, ease: "linear" } : { duration: 0.6 }}
    >
      <span className="absolute inset-[22%] overflow-hidden rounded-full border-2 border-rose-300/70">
        <Image src={HERO_PHOTO} alt="" fill sizes="40px" className="object-cover" />
      </span>
      <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
    </motion.span>
  );
}

export default function MusicPlayer() {
  const { t: dict } = useLang();
  const t = dict.music;

  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const wantPlayRef = useRef(false);
  const indexRef = useRef(0);
  const failsRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  const track = PLAYLIST[index];

  const step = (d: number) => {
    setTime(0);
    setDuration(0);
    setError(false);
    setIndex((i) => (i + d + PLAYLIST.length) % PLAYLIST.length);
  };
  // Dipakai dari callback YouTube, yang tidak ikut render ulang.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  // Buat player YouTube sekali, saat panel pertama kali dibuka.
  useEffect(() => {
    if (!activated) return;
    const wrapper = hostRef.current;
    if (!wrapper) return;
    let cancelled = false;
    // YouTube mengganti elemen ini dengan <iframe>, jadi dibuat di luar React.
    const el = document.createElement("div");
    wrapper.appendChild(el);

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(el, {
        videoId: PLAYLIST[indexRef.current].youtubeId,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => {
            readyRef.current = true;
            if (wantPlayRef.current) playerRef.current?.playVideo();
          },
          onStateChange: ({ data }) => {
            if (data === PLAYING) {
              failsRef.current = 0;
              setPlaying(true);
              setError(false);
            } else if (data === PAUSED) {
              setPlaying(false);
            } else if (data === ENDED) {
              stepRef.current(1);
            }
          },
          onError: () => {
            // Video dihapus / pemilik tidak mengizinkan embed: lompat ke lagu berikutnya.
            setError(true);
            setPlaying(false);
            failsRef.current += 1;
            if (failsRef.current < PLAYLIST.length) setTimeout(() => stepRef.current(1), 2500);
          },
        },
      });
    }).catch(() => {
      if (!cancelled) setError(true);
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      readyRef.current = false;
      wrapper.innerHTML = "";
    };
  }, [activated]);

  // Ganti lagu.
  useEffect(() => {
    indexRef.current = index;
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    const id = PLAYLIST[index].youtubeId;
    if (wantPlayRef.current) player.loadVideoById(id);
    else player.cueVideoById(id);
  }, [index]);

  // Perbarui progres selama lagu diputar.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setTime(player.getCurrentTime());
      setDuration(player.getDuration());
    }, 500);
    return () => clearInterval(id);
  }, [playing]);

  if (!track) return null;

  const openPanel = () => {
    setOpen(true);
    if (!activated) {
      wantPlayRef.current = true;
      setActivated(true);
    }
  };

  // Aturan YouTube: video tidak boleh diputar tersembunyi, jadi dijeda saat dikecilkan.
  const minimize = () => {
    wantPlayRef.current = false;
    playerRef.current?.pauseVideo();
    setOpen(false);
  };

  const toggle = () => {
    const player = playerRef.current;
    if (playing) {
      wantPlayRef.current = false;
      player?.pauseVideo();
    } else {
      wantPlayRef.current = true;
      if (player && readyRef.current) player.playVideo();
    }
  };

  const btn =
    "grid size-9 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white";

  return (
    <div className="fixed bottom-4 left-3 z-50 md:bottom-8 md:left-6">
      {/* Panel tetap terpasang setelah dibuka supaya player tidak dibuat ulang */}
      {activated && (
        <motion.div
          className={`w-[min(20rem,calc(100vw-1.5rem))] rounded-3xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl ${
            open ? "" : "hidden"
          }`}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={open ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
          style={{ originX: 0, originY: 1 }}
        >
          <div className="flex items-center gap-3">
            <Disc playing={playing} size="size-11" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300/80">
                {t.nowPlaying}
              </p>
              <p className="truncate font-bold text-white">{track.title}</p>
              {track.artist && <p className="truncate text-xs text-zinc-400">{track.artist}</p>}
            </div>
            <button type="button" onClick={minimize} aria-label={t.close} className={btn}>
              <ChevronDown className="size-4" />
            </button>
          </div>

          {/* Video YouTube (minimal 200px tinggi sesuai aturan YouTube) */}
          <div className="relative mt-3 h-[200px] w-full overflow-hidden rounded-2xl bg-black">
            <div ref={hostRef} className="absolute inset-0" />
            {error && (
              <div className="absolute inset-0 grid place-items-center bg-black/85 p-4 text-center">
                <div>
                  <p className="text-sm text-zinc-300">{t.unavailable}</p>
                  <a
                    href={ytMusicUrl(track.youtubeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-black"
                  >
                    {t.openYtm} <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={Math.min(time, duration || 0)}
            onChange={(e) => {
              const v = Number(e.target.value);
              playerRef.current?.seekTo(v, true);
              setTime(v);
            }}
            aria-label={track.title}
            className="mt-4 h-1 w-full cursor-pointer accent-rose-300"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <a
              href={ytMusicUrl(track.youtubeId)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.openYtm}
              title={t.openYtm}
              className={btn}
            >
              <ExternalLink className="size-4" />
            </a>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => step(-1)} aria-label={t.prev} className={btn}>
                <SkipBack className="size-4" />
              </button>
              <motion.button
                type="button"
                onClick={toggle}
                aria-label={playing ? t.pause : t.play}
                className="grid size-12 place-items-center rounded-full bg-gradient-to-r from-rose-300 to-amber-200 text-black"
                whileTap={{ scale: 0.9 }}
              >
                {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
              </motion.button>
              <button type="button" onClick={() => step(1)} aria-label={t.next} className={btn}>
                <SkipForward className="size-4" />
              </button>
            </div>
            <span className="w-9 text-center font-mono text-[10px] text-zinc-500">
              {index + 1}/{PLAYLIST.length}
            </span>
          </div>
        </motion.div>
      )}

      <AnimatePresence initial={false}>
        {!open && (
          <motion.button
            key="pill"
            type="button"
            onClick={openPanel}
            aria-label={t.open}
            title={t.open}
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 p-1.5 pr-3 shadow-xl backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
          >
            <Disc playing={false} size="size-9" />
            <span className="text-base" aria-hidden>
              🎵
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
