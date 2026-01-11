import { useCallback, useEffect, useRef, useState } from "react";

export default function useVoice(socketRef, session) {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voicePeers, setVoicePeers] = useState([]);
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const audioElementsRef = useRef(new Map()); // peerId -> HTMLAudioElement
  const iceServersRef = useRef(null);
  const pendingCandidatesRef = useRef(new Map()); // peerId -> candidate[]

  // Clean up a peer connection
  const cleanupPeer = useCallback((peerId) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }

    const audio = audioElementsRef.current.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      audioElementsRef.current.delete(peerId);
    }

    pendingCandidatesRef.current.delete(peerId);
  }, []);

  // Clean up all connections
  const cleanupAll = useCallback(() => {
    peerConnectionsRef.current.forEach((_, peerId) => {
      cleanupPeer(peerId);
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  }, [cleanupPeer]);

  // Create RTCPeerConnection for a peer
  const createPeerConnection = useCallback((peerId, isInitiator) => {
    const socket = socketRef?.current;
    if (!socket) return null;

    const config = {
      iceServers: iceServersRef.current?.iceServers || [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(config);
    peerConnectionsRef.current.set(peerId, pc);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      let audio = audioElementsRef.current.get(peerId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.playsInline = true;
        audioElementsRef.current.set(peerId, audio);
      }
      audio.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("voice:ice-candidate", {
          targetPlayerId: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        cleanupPeer(peerId);
      }
    };

    // If we have pending ICE candidates, add them now
    const pending = pendingCandidatesRef.current.get(peerId) || [];
    pending.forEach((candidate) => {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });
    pendingCandidatesRef.current.delete(peerId);

    return pc;
  }, [socketRef, cleanupPeer]);

  // Create offer and send to peer
  const createAndSendOffer = useCallback(async (peerId) => {
    const socket = socketRef?.current;
    if (!socket) return;

    const pc = createPeerConnection(peerId, true);
    if (!pc) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("voice:offer", {
        targetPlayerId: peerId,
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error("Failed to create offer:", err);
      cleanupPeer(peerId);
    }
  }, [socketRef, createPeerConnection, cleanupPeer]);

  // Handle incoming offer
  const handleOffer = useCallback(async (fromPlayerId, sdp) => {
    const socket = socketRef?.current;
    if (!socket) return;

    let pc = peerConnectionsRef.current.get(fromPlayerId);
    if (!pc) {
      pc = createPeerConnection(fromPlayerId, false);
    }
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice:answer", {
        targetPlayerId: fromPlayerId,
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error("Failed to handle offer:", err);
      cleanupPeer(fromPlayerId);
    }
  }, [socketRef, createPeerConnection, cleanupPeer]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (fromPlayerId, sdp) => {
    const pc = peerConnectionsRef.current.get(fromPlayerId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.error("Failed to handle answer:", err);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (fromPlayerId, candidate) => {
    const pc = peerConnectionsRef.current.get(fromPlayerId);
    if (!pc) {
      // Queue for later
      const pending = pendingCandidatesRef.current.get(fromPlayerId) || [];
      pending.push(candidate);
      pendingCandidatesRef.current.set(fromPlayerId, pending);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Failed to add ICE candidate:", err);
    }
  }, []);

  // Join voice chat
  const joinVoice = useCallback(async () => {
    const socket = socketRef?.current;
    if (!socket || isInVoice) return;

    setError(null);

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;

      // Request ICE servers
      socket.emit("voice:get-ice-servers");

      // Join voice room
      socket.emit("voice:join");
      setIsInVoice(true);
    } catch (err) {
      console.error("Failed to join voice:", err);
      if (err.name === "NotAllowedError") {
        setError("Microphone access denied");
      } else if (err.name === "NotFoundError") {
        setError("No microphone found");
      } else {
        setError("Failed to join voice chat");
      }
    }
  }, [socketRef, isInVoice]);

  // Leave voice chat
  const leaveVoice = useCallback(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    socket.emit("voice:leave");
    cleanupAll();
    setIsInVoice(false);
    setIsMuted(false);
  }, [socketRef, cleanupAll]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleIceServers = (data) => {
      iceServersRef.current = data;
    };

    const handleVoicePeers = ({ peers }) => {
      // Filter out self
      const others = peers.filter((p) => p.playerId !== session?.playerId);
      setVoicePeers(others);
    };

    const handlePeerJoined = ({ playerId, displayName }) => {
      if (!isInVoice) return;
      // Create offer for new peer
      createAndSendOffer(playerId);
    };

    const handlePeerLeft = ({ playerId }) => {
      cleanupPeer(playerId);
      setVoicePeers((prev) => prev.filter((p) => p.playerId !== playerId));
    };

    const handleVoiceOffer = ({ fromPlayerId, sdp }) => {
      if (!isInVoice) return;
      handleOffer(fromPlayerId, sdp);
    };

    const handleVoiceAnswer = ({ fromPlayerId, sdp }) => {
      handleAnswer(fromPlayerId, sdp);
    };

    const handleVoiceIceCandidate = ({ fromPlayerId, candidate }) => {
      handleIceCandidate(fromPlayerId, candidate);
    };

    socket.on("voice:ice-servers", handleIceServers);
    socket.on("voice:peers", handleVoicePeers);
    socket.on("voice:peer-joined", handlePeerJoined);
    socket.on("voice:peer-left", handlePeerLeft);
    socket.on("voice:offer", handleVoiceOffer);
    socket.on("voice:answer", handleVoiceAnswer);
    socket.on("voice:ice-candidate", handleVoiceIceCandidate);

    return () => {
      socket.off("voice:ice-servers", handleIceServers);
      socket.off("voice:peers", handleVoicePeers);
      socket.off("voice:peer-joined", handlePeerJoined);
      socket.off("voice:peer-left", handlePeerLeft);
      socket.off("voice:offer", handleVoiceOffer);
      socket.off("voice:answer", handleVoiceAnswer);
      socket.off("voice:ice-candidate", handleVoiceIceCandidate);
    };
  }, [
    socketRef,
    session?.playerId,
    isInVoice,
    createAndSendOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanupPeer,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  return {
    isInVoice,
    isMuted,
    voicePeers,
    error,
    joinVoice,
    leaveVoice,
    toggleMute,
  };
}
