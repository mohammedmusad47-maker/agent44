import { supabase } from '@/integrations/supabase/client';

export class ElevenLabsWebRTC {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private onMessageCallback: ((message: any) => void) | null = null;
  private isSpeakingCallback: ((speaking: boolean) => void) | null = null;

  constructor() {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  setOnMessage(callback: (message: any) => void) {
    this.onMessageCallback = callback;
  }

  setOnSpeaking(callback: (speaking: boolean) => void) {
    this.isSpeakingCallback = callback;
  }

  async connect() {
    try {
      console.log('Setting up WebRTC connection...');

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio
      this.pc.ontrack = (e) => {
        console.log('Received audio track');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track for microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      this.pc.addTrack(stream.getTracks()[0]);
      console.log('Added microphone track');

      // Set up data channel for messages
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log('Data channel opened');
      });

      this.dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log('Received message:', event);
          
          // Detect when AI is speaking
          if (event.type === 'audio' || event.type === 'response.audio.delta') {
            this.isSpeakingCallback?.(true);
          } else if (event.type === 'response.audio.done' || event.type === 'response.done') {
            this.isSpeakingCallback?.(false);
          }
          
          // Handle transcription events
          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            this.onMessageCallback?.({
              role: 'user',
              text: event.transcript
            });
          } else if (event.type === 'response.audio_transcript.delta') {
            this.onMessageCallback?.({
              role: 'assistant',
              text: event.delta,
              partial: true
            });
          } else if (event.type === 'response.audio_transcript.done') {
            this.onMessageCallback?.({
              role: 'assistant',
              text: event.transcript,
              partial: false
            });
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log('Created offer');

      // Send offer to our Edge Function which proxies to ElevenLabs
      const { data: ansData, error: ansError } = await supabase.functions.invoke('elevenlabs-webrtc', {
        body: { offerSdp: offer.sdp }
      });

      if (ansError) {
        console.error('SDP exchange function error:', ansError);
        throw new Error(`SDP exchange failed: ${ansError.message}`);
      }

      if (!ansData?.ok || !ansData?.sdp) {
        throw new Error(ansData?.error || 'No SDP answer received');
      }

      const answerSdp = ansData.sdp;
      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: answerSdp,
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log('WebRTC connection established!');

      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  disconnect() {
    console.log('Disconnecting...');
    
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    if (this.audioEl.srcObject) {
      const stream = this.audioEl.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.audioEl.srcObject = null;
    }
  }

  isConnected(): boolean {
    return this.pc?.connectionState === 'connected';
  }
}
