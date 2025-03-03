'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Activity } from 'lucide-react';

const VoicePracticeApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [scenario, setScenario] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [silenceDetected, setSilenceDetected] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const listeningRef = useRef<boolean>(false);

  // Speech synthesis fallback setup
  const useBrowserTTS = () => {
    const utterance = new SpeechSynthesisUtterance();
    utterance.rate = 0.9; // Slightly slower than default
    utterance.pitch = 1;
    return utterance;
  };

  // Generate a random scenario
  const generateScenario = () => {
    const homeTypes = ['Single Family', 'Townhouse', 'Condo', 'Multi-Family'];
    const reasons = ['Retirement', 'Job Relocation', 'Growing Family', 'Downsizing', 'Investment'];
    const timelines = ['ASAP', '3-6 months', '6-12 months', 'Just exploring'];
    const personalities = [
      { type: 'Eager', description: 'Enthusiastic about selling, asks lots of questions' },
      { type: 'Hesitant', description: 'Needs more convincing, concerned about market' },
      { type: 'Analytical', description: 'Focuses on data and numbers' },
      { type: 'Busy', description: 'Limited time, needs quick answers' },
      { type: 'Skeptical', description: 'Questions everything, needs proof' }
    ];
    
    setScenario({
      personality: personalities[Math.floor(Math.random() * personalities.length)],
      homeType: homeTypes[Math.floor(Math.random() * homeTypes.length)],
      bedrooms: Math.floor(Math.random() * 4) + 2,
      bathrooms: Math.floor(Math.random() * 3) + 1,
      purchaseYear: 2010 + Math.floor(Math.random() * 13),
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      timeline: timelines[Math.floor(Math.random() * timelines.length)]
    });
    setConversationHistory([]);
  };

  useEffect(() => {
    generateScenario();
    return () => {
      // Cleanup
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Setup voice activity detection
  const setupVoiceActivityDetection = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevel = () => {
      if (!listeningRef.current) return;
      
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // If average is below threshold, consider it silence
      if (average < 10) { // Adjust threshold as needed
        if (!silenceDetected) {
          setSilenceDetected(true);
          
          // Start timer to stop recording after sustained silence
          silenceTimeoutRef.current = setTimeout(() => {
            if (listeningRef.current && !processingAudio) {
              console.log('Silence detected, stopping recording automatically');
              stopRecording();
            }
          }, 1500); // 1.5 seconds of silence
        }
      } else {
        // Reset silence detection if sound is detected
        setSilenceDetected(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      }
      
      // Continue checking if still recording
      if (listeningRef.current) {
        requestAnimationFrame(checkAudioLevel);
      }
    };
    
    requestAnimationFrame(checkAudioLevel);
  };

  const startRecording = async () => {
    console.log('Starting recording...');
    try {
      // Stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      console.log('Got media stream:', stream);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Setup voice activity detection
      setupVoiceActivityDetection(stream);
      listeningRef.current = true;

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available from recorder:', event.data);
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        listeningRef.current = false;
        if (chunksRef.current.length === 0 || processingAudio) return;
        
        setProcessingAudio(true);
        console.log('Recording stopped, processing audio...');
        const recordedBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('Created blob:', recordedBlob);
        
        try {
          await processAudio(recordedBlob);
          
          // If in continuous mode, start recording again after processing
          if (continuousMode) {
            setTimeout(() => {
              startRecording();
            }, 500); // Small delay to ensure processing is complete
          }
        } catch (error) {
          console.error('Error processing audio:', error);
        } finally {
          setProcessingAudio(false);
        }
      };

      mediaRecorder.start();
      console.log('MediaRecorder started');
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const processAudio = async (recordedBlob: Blob) => {
    try {
      console.log('Starting audio processing...');
      
      const formData = new FormData();
      formData.append('file', recordedBlob);
      
      console.log('Sending audio for transcription...');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Transcription error details:', errorData);
        throw new Error(`Transcription failed: ${errorData.error || 'Unknown error'}`);
      }

      const transcriptionData = await response.json();
      console.log('Transcription result:', transcriptionData);
      
      // Skip if transcription is too short or empty
      if (!transcriptionData.text || transcriptionData.text.trim().length < 2) {
        console.log('Transcription too short, skipping');
        return;
      }

      // Add agent's message to conversation
      const updatedHistory = [...conversationHistory, `Agent: ${transcriptionData.text}`];
      setConversationHistory(updatedHistory);

      console.log('Generating AI response...');
      const responseData = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: transcriptionData.text,
          personality: scenario.personality.type,
          stage: 'conversation',
          conversationHistory: updatedHistory
        })
      });

      if (!responseData.ok) {
        throw new Error('Failed to generate response');
      }

      const aiResponse = await responseData.json();
      console.log('AI response content:', aiResponse);

      // Add AI response to conversation immediately
      setConversationHistory(prev => [...prev, `Homeowner: ${aiResponse.response}`]);

      // Try ElevenLabs first
      try {
        console.log('Generating speech with ElevenLabs...');
        const speechResponse = await fetch('/api/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: aiResponse.response
          })
        });

        if (speechResponse.ok) {
          // Play the audio response
          const audioBlob = await speechResponse.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            if (continuousMode && !isRecording && !processingAudio) {
              startRecording();
            }
          };
          await audio.play();
          return; // Successfully played audio, exit function
        } 
        
        // If ElevenLabs fails, fall back to browser TTS
        console.warn('ElevenLabs TTS failed, falling back to browser TTS');
        throw new Error('ElevenLabs TTS failed');
      } catch (error) {
        // Fallback to browser's speech synthesis
        console.log('Using browser speech synthesis fallback');
        const utterance = useBrowserTTS();
        utterance.text = aiResponse.response;
        
        // Handle completion of speech
        utterance.onend = () => {
          if (continuousMode && !isRecording && !processingAudio) {
            startRecording();
          }
        };
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Detailed error:', error);
      console.error('Error stack:', error.stack);
      alert(`Error processing audio: ${error.message}`);
    }
  };

  const stopRecording = () => {
    console.log('Stop recording called');
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping MediaRecorder');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      listeningRef.current = false;
      
      // Don't stop tracks here to allow for continuous mode
      // We'll stop them when switching to a new recording session
    }
  };

  const toggleRecording = () => {
    console.log('Toggle recording called, current state:', isRecording);
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleContinuousMode = () => {
    setContinuousMode(!continuousMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-blue-800 mb-3">Real Estate Voice Practice</h1>
          <p className="text-gray-600">Practice your real estate scripts with AI-simulated homeowner responses</p>
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleContinuousMode}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                  continuousMode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                <Activity size={14} />
                {continuousMode ? 'Continuous Mode: On' : 'Continuous Mode: Off'}
              </button>
              
              {silenceDetected && isRecording && (
                <span className="text-xs text-gray-500 animate-pulse">Silence detected...</span>
              )}
              
              {processingAudio && (
                <span className="text-xs text-blue-500 animate-pulse">Processing your response...</span>
              )}
            </div>
            
            <button 
              onClick={generateScenario}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RefreshCw size={16} />
              <span>New Conversation</span>
            </button>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex justify-center mb-8">
          <button
            onClick={toggleRecording}
            disabled={processingAudio}
            className={`flex items-center gap-2 px-8 py-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 ${
              processingAudio ? 
                'bg-gray-400 cursor-not-allowed text-white' :
                isRecording ? 
                  'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 
                  'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-6 h-6" />
                <span className="text-lg font-semibold">Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                <span className="text-lg font-semibold">Start Recording</span>
              </>
            )}
          </button>
        </div>

        {/* Conversation History */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-blue-700 text-white p-3">
            <h2 className="font-semibold">Practice Conversation</h2>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-4">
            {conversationHistory.map((message, index) => {
              const parts = message.split(': ');
              const role = parts[0];
              const text = parts.slice(1).join(': '); // Rejoin in case the message itself contains colons
              const isAgent = role === 'Agent';
              
              return (
                <div key={index} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg p-3 ${
                    isAgent 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  } max-w-[80%]`}>
                    <p className="text-xs font-bold mb-1">{isAgent ? 'You' : 'Homeowner'}</p>
                    <p>{text}</p>
                  </div>
                </div>
              );
            })}
            {conversationHistory.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Start recording to begin your call
              </div>
            )}
          </div>
        </div>

        {/* Admin View - Hidden by Default */}
        {showAdmin && scenario && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Scenario Details (Admin View)</h3>
              <button 
                onClick={() => setShowAdmin(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Hide
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Personality:</span>
                <p className="text-gray-600">{scenario.personality.type} - {scenario.personality.description}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Property:</span>
                <p className="text-gray-600">{scenario.bedrooms}bed/{scenario.bathrooms}bath {scenario.homeType}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Purchase Year:</span>
                <p className="text-gray-600">{scenario.purchaseYear}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Timeline:</span>
                <p className="text-gray-600">{scenario.timeline}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Admin Toggle Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {showAdmin ? 'Hide Admin Panel' : 'Show Admin Panel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoicePracticeApp;