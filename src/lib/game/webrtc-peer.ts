const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const CONNECTION_TIMEOUT_MS = 5000;

export interface WebRTCPeer {
  createOffer(): Promise<string>;
  handleAnswer(sdp: string): Promise<void>;
  handleOffer(sdp: string): Promise<string>;
  addIceCandidate(candidate: string): Promise<void>;
  getRemoteStream(): MediaStream | null;
  setLocalStream(stream: MediaStream): void;
  onIceCandidate: ((candidate: string) => void) | null;
  onRemoteStream: ((stream: MediaStream) => void) | null;
  onConnectionFailed: (() => void) | null;
  destroy(): void;
}

export function createWebRTCPeer(): WebRTCPeer {
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  let remoteStream: MediaStream | null = null;
  let connectionTimer: ReturnType<typeof setTimeout> | null = null;

  function startConnectionTimer() {
    if (connectionTimer) clearTimeout(connectionTimer);
    connectionTimer = setTimeout(() => {
      if (!remoteStream && peer.onConnectionFailed) {
        peer.onConnectionFailed();
      }
    }, CONNECTION_TIMEOUT_MS);
  }

  const peer: WebRTCPeer = {
    onIceCandidate: null,
    onRemoteStream: null,
    onConnectionFailed: null,

    setLocalStream(stream: MediaStream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    },

    async createOffer(): Promise<string> {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      startConnectionTimer();
      return JSON.stringify(offer);
    },

    async handleAnswer(sdp: string): Promise<void> {
      const answer = JSON.parse(sdp) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);
    },

    async handleOffer(sdp: string): Promise<string> {
      const offer = JSON.parse(sdp) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      startConnectionTimer();
      return JSON.stringify(answer);
    },

    async addIceCandidate(candidate: string): Promise<void> {
      const c = JSON.parse(candidate) as RTCIceCandidateInit;
      await pc.addIceCandidate(c);
    },

    getRemoteStream(): MediaStream | null {
      return remoteStream;
    },

    destroy() {
      if (connectionTimer) clearTimeout(connectionTimer);
      pc.close();
      remoteStream = null;
    },
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && peer.onIceCandidate) {
      peer.onIceCandidate(JSON.stringify(event.candidate));
    }
  };

  pc.ontrack = (event) => {
    remoteStream = event.streams[0] ?? new MediaStream([event.track]);
    if (connectionTimer) {
      clearTimeout(connectionTimer);
      connectionTimer = null;
    }
    if (peer.onRemoteStream) peer.onRemoteStream(remoteStream);
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      if (peer.onConnectionFailed) peer.onConnectionFailed();
    }
  };

  return peer;
}
