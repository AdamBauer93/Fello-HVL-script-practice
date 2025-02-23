'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw } from 'lucide-react';

const VoicePracticeApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [scenario, setScenario] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
  }, []);

  const startRecording = async () => {
    console.log('Starting recording...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Got media stream:', stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available from recorder:', event.data);
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const recordedBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        console.log('Created blob:', recordedBlob);
        await processAudio(recordedBlob);
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
      
      // First, transcribe the audio
      const formData = new FormData();
      formData.append('file', recordedBlob);
      
      console.log('Sending audio for transcription...', {
        blobType: recordedBlob.type,
        blobSize: recordedBlob.size
      });

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      console.log('Raw transcription response:', response);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Transcription error details:', errorData);
        throw new Error(`Transcription failed: ${errorData.error || errorData.details || 'Unknown error'}`);
      }

      const transcriptionData = await response.json();
      console.log('Transcription result:', transcriptionData);

      // Add agent's message to conversation
      setConversationHistory(prev => [...prev, `Agent: ${transcriptionData.text}`]);

      console.log('Generating AI response...');
      // Generate AI response
      const responseData = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: transcriptionData.text,
          personality: scenario.personality.type,
          stage: 'conversation'
        })
      });

      console.log('AI response data:', responseData);

      if (!responseData.ok) {
        throw new Error('Failed to generate response');
      }

      const aiResponse = await responseData.json();
      console.log('AI response content:', aiResponse);

      // Generate speech from response
      console.log('Generating speech...');
      const speechResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: aiResponse.response
        })
      });

      console.log('Speech response:', speechResponse);

      if (!speechResponse.ok) {
        throw new Error('Failed to generate speech');
      }

      // Play the audio response
      const audioBlob = await speechResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

      // Add AI response to conversation
      setConversationHistory(prev => [...prev, `Homeowner: ${aiResponse.response}`]);

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
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Real Estate Script Practice</h1>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={toggleRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-5 h-5" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Recording
            </>
          )}
        </button>
        
        <button
          onClick={generateScenario}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white"
        >
          <RefreshCw className="w-5 h-5" />
          New Scenario
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Conversation History</h2>
        <div className="space-y-4">
          {conversationHistory.map((message, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg ${
                message.startsWith('Agent:')
                  ? 'bg-blue-100 ml-8' 
                  : 'bg-gray-200 mr-8'
              }`}
            >
              {message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoicePracticeApp;