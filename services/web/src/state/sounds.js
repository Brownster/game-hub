const SOUND_STORAGE_KEY = "gamehub:sound";

const sounds = {
  beep: new Audio("/audio/beep.mp3"),
  place: new Audio("/audio/place.mp3"),
  invalid: new Audio("/audio/invalid.mp3"),
  silence: new Audio("/audio/silence.mp3"),
  bgm: new Audio("/audio/bgm.mp3")
};

sounds.bgm.loop = true;

let unlocked = false;
let soundEnabled = true;

function loadSoundSetting() {
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    if (stored === "off") {
      soundEnabled = false;
    }
  } catch {
    // Ignore storage errors in restricted contexts.
  }
}

loadSoundSetting();

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Ignore storage errors in restricted contexts.
  }
  if (!enabled) {
    sounds.bgm.pause();
  } else if (unlocked) {
    startBackground();
  }
}

export function unlockAudio() {
  if (unlocked) return;
  loadSoundSetting();
  unlocked = true;

  if (!soundEnabled) return;

  sounds.silence.volume = 0;
  sounds.silence.play().catch(() => {});
  startBackground();
}

export function playSound(name) {
  if (!soundEnabled) return;
  const sound = sounds[name];
  if (!sound) return;

  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function startBackground() {
  sounds.bgm.volume = 0.08;
  sounds.bgm.play().catch(() => {});
}
