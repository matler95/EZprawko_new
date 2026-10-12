import { createAudioPlayer, type AudioPlayer } from "expo-audio";

const WAV_PREFIX = "data:audio/wav;base64,";

// Original, generated-in-code tones. They avoid a licensed binary asset while
// keeping answer feedback instant and intentionally subtle.
const SUCCESS_TONE =
  "UklGRgQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YeABAACAudjPoWQ0J0J6tdfRpmo3Jj51sNbUq287Jjtvq9TWsHU+JjdqptHXtXpCJzRkoc/YuYBHKDFfnMzZvoZLKS9alsnawotQKixVkcXaxZFVLCpQi8LayZZaLylLhr7ZzJxfMShHgLnYz6FkNCdCerXX0aZqNyY+dbDW1KtvOyY7b6vU1rB1PiY3aqbR17V6Qic0ZKHP2LmARygxX5zM2b6GSykvWpbJ2sKLUCosVZHF2sWRVSwqUIvC2smWWi8pS4a+2cycXzEoR4C52M+hZDQnQnq119GmajcmPnWw1tSrbzsmO2+r1NawdT4mN2qm0de1ekInNGShz9i5gEcoMV+czNm+hkspL1qWydrCi1AqLFWRxdrFkVUsKlCLwtrJllovKUuGvtnMnF8xKEeAudjPoWQ0J0J6tdfRpmo3Jj51sNbUq287Jjtvq9TWsHU+JjdqptHXtXpCJzRkoc/YuYBHKDFfnMzZvoZLKS9alsnawotQKixVkcXaxZFVLCpQi8LayZZaLylLhr7ZzJxfMShHgLnYz6FkNCdCerXX0aZqNyY+dbDW1KtvOyY7b6vU1rB1PiY3aqbR17V6Qic0ZKHP2LmARygxX5zM2b6GSykvWpbJ2sKLUCosVZHF2sWRVSwqUIvC2smWWi8pS4a+2cycXzEoR4C52M+hZDQnQnq119GmajcmPnWw1tSrbzsmO2+r1NawdT4mN2qm0de1ekInNGShz9i5gEcoMV+czNm+hkspL1qWydrCi1AqLFWRxdrFkVUsKlCLwtrJllovKUuGvtnMnF8xKEeA=";
const ERROR_TONE =
  "UklGRgQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YeABAACAj56tucTN1Nja2dXPxryvoZKDc2RWST00LSgmJyowOEJPXGt6ipmotcHK0tfa2tfRysC0ppiIeWpbTUE3LyonJigtNT5KV2Z1hJSisL3H0NbZ2tjUzcS4q52Of29gUkY7MisnJictMjtGUmBvf46dq7jEzdTY2tnW0Me9sKKUhHVmV0o+NS0oJicqLzdBTVtqeYiYprTAytHX2trX0srBtaiZinprXE9CODAqJyYoLTQ9SVZkc4OSoa+8xs/V2drY1M3Eua2ej4BxYlNHPDMsKCYnKzE6RFFfbn2NnKq3w8zT2NrZ1tDIvrGklYZ2Z1hLPzYuKSYmKS82QExaaHiHlqWzv8nR1tna2NPLwrapmot8bF5QQzkwKicmKCwzPEhVY3KBkaCuusXO1dna2dXOxbquoJGBcmNVSDwzLCgmJyowOUNQXmx8i5qptsLL09ja2dbRyb+zpZaHeGhaTEA2LykmJikuNj9LWGd2hpWksb7I0NbZ2tjTzMO3qpyNfW5fUUQ6MSsnJigsMzxHU2JxgI+erbnEzdTY2tnVz8a8r6GSg3NkVkk9NC0oJicqMDhCT1xreoqZqLXBytLX2trX0crAtKaYiHlqW01BNy8qJyYoLTU+SldmdYSUorC9x9A=";

let successPlayer: AudioPlayer | undefined;
let errorPlayer: AudioPlayer | undefined;

export function playAnswerSound(correct: boolean) {
  try {
    const player = correct
      ? (successPlayer ??= createAudioPlayer(`${WAV_PREFIX}${SUCCESS_TONE}`))
      : (errorPlayer ??= createAudioPlayer(`${WAV_PREFIX}${ERROR_TONE}`));
    player.seekTo(0);
    player.play();
  } catch {
    // Audio availability varies by device and silent-mode settings; haptics and
    // the visible result remain the reliable feedback paths.
  }
}
