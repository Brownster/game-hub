import React, { useEffect, useState } from "react";
import { isSoundEnabled, setSoundEnabled, unlockAudio } from "../state/sounds.js";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const toggle = () => {
    unlockAudio();
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
  };

  return (
    <button className="button secondary" onClick={toggle}>
      Sound: {enabled ? "On" : "Off"}
    </button>
  );
}
