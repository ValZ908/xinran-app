// Daftar lagu untuk mini music player, diputar lewat YouTube / YouTube Music.
//
// Cara menambah lagu: buka lagunya di music.youtube.com atau youtube.com,
// salin ID dari link-nya (bagian setelah "v="), lalu tambahkan di bawah.
//   https://music.youtube.com/watch?v=jBXPUWcdw7g  →  youtubeId: "jBXPUWcdw7g"
//
// Kalau sebuah video tidak boleh di-embed oleh pemiliknya, player otomatis
// lompat ke lagu berikutnya dan menampilkan link ke YouTube Music.

export type Track = { title: string; artist?: string; youtubeId: string };

export const PLAYLIST: Track[] = [
  { title: "IF", artist: "Song Xinran", youtubeId: "jBXPUWcdw7g" },
  { title: "缘说 (Fate Theory)", artist: "Song Xinran · Rebirth For You OST", youtubeId: "g3r0N0ruk4M" },
  { title: "无怨 (No Resentment)", artist: "Song Xinran · Rebirth For You OST", youtubeId: "Emt0klJChZo" },
  { title: "Ice Queen", artist: "SNH48 Team X · Song Xinran", youtubeId: "QtWJQMx_KBo" },
  { title: "怦然心动 (Bong! Bong! Bong!)", artist: "SNH48 · Song Xinran (center)", youtubeId: "uDbv9vlZIEg" },
];

export const ytMusicUrl = (id: string) => `https://music.youtube.com/watch?v=${id}`;
