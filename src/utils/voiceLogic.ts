export class VoiceLogic {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private onTranscriptionCallback: (text: string) => void;
    private onErrorCallback: (error: string) => void;
  
    constructor(
      onTranscription: (text: string) => void,
      onError: (error: string) => void
    ) {
      this.onTranscriptionCallback = onTranscription;
      this.onErrorCallback = onError;
    }
  
    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];
  
        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };
  
        this.mediaRecorder.onstop = async () => {
          await this.processRecording();
        };
  
        this.mediaRecorder.start();
      } catch (error) {
        console.error('Error starting recording:', error);
        this.onErrorCallback('Failed to start recording. Please check your microphone permissions.');
      }
    }
  
    stopRecording() {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        const tracks = this.mediaRecorder.stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    }
  
    private async processRecording() {
      try {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const transcription = await this.transcribeAudio(audioBlob);
        this.onTranscriptionCallback(transcription);
      } catch (error) {
        console.error('Error processing recording:', error);
        this.onErrorCallback('Failed to process recording. Please try again.');
      }
    }
  
    private async transcribeAudio(audioBlob: Blob): Promise<string> {
      try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        formData.append('model', 'whisper-1');
  
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) {
          throw new Error('Transcription failed');
        }
  
        const data = await response.json();
        return data.text;
      } catch (error) {
        console.error('Error transcribing audio:', error);
        throw new Error('Failed to transcribe audio');
      }
    }
  
    async playAudioResponse(audioUrl: string) {
      try {
        const audio = new Audio(audioUrl);
        await audio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        this.onErrorCallback('Failed to play response audio.');
      }
    }
  }
  
  export default VoiceLogic;