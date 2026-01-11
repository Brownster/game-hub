import React from "react";

export default function VoicePanel({
  isInVoice,
  isMuted,
  voicePeers,
  error,
  onJoin,
  onLeave,
  onToggleMute,
  players,
  session,
}) {
  // Get display names from players list
  const getPeerName = (peerId) => {
    const player = players.find((p) => p.playerId === peerId);
    return player?.displayName || "Unknown";
  };

  return (
    <div className="voice-panel">
      <div className="voice-panel-title">Voice Chat</div>

      {error && <div className="voice-error">{error}</div>}

      <div className="voice-controls">
        {!isInVoice ? (
          <button className="room-btn primary voice-join-btn" onClick={onJoin}>
            Join Voice
          </button>
        ) : (
          <>
            <button
              className={`room-btn voice-mute-btn ${isMuted ? "muted" : ""}`}
              onClick={onToggleMute}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button className="room-btn secondary voice-leave-btn" onClick={onLeave}>
              Leave
            </button>
          </>
        )}
      </div>

      {isInVoice && (
        <div className="voice-peer-list">
          <div className="voice-peer you">
            <span className="voice-peer-icon">{isMuted ? "🔇" : "🎤"}</span>
            <span className="voice-peer-name">{session?.displayName} (You)</span>
          </div>
          {voicePeers.map((peer) => (
            <div key={peer.playerId} className="voice-peer">
              <span className="voice-peer-icon">🎤</span>
              <span className="voice-peer-name">{getPeerName(peer.playerId)}</span>
            </div>
          ))}
          {voicePeers.length === 0 && (
            <div className="voice-empty">Waiting for others to join...</div>
          )}
        </div>
      )}

      {!isInVoice && voicePeers.length > 0 && (
        <div className="voice-active-hint">
          {voicePeers.length} {voicePeers.length === 1 ? "person" : "people"} in voice
        </div>
      )}

      {players.length > 6 && !isInVoice && (
        <div className="voice-warning">
          Voice works best with 6 or fewer players
        </div>
      )}
    </div>
  );
}
