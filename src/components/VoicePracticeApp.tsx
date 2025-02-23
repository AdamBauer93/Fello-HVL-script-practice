'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Eye, EyeOff } from 'lucide-react';

const VoicePracticeApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [scenario, setScenario] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Admin Toggle */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Real Estate Script Practice</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors duration-200"
              >
                {showAdmin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {showAdmin ? 'Hide Admin' : 'Show Admin'}
              </button>
              <button
                onClick={generateScenario}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors duration-200"
              >
                <RefreshCw className="w-5 h-5" />
                New Scenario
              </button>
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex justify-center mb-8">
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-8 py-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
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
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Conversation History</h2>
          <div className="space-y-4">
            {conversationHistory.map((message, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg transition-all duration-200 ${
                  message.startsWith('Agent:')
                    ? 'bg-blue-50 ml-12 hover:bg-blue-100' 
                    : 'bg-gray-50 mr-12 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium mb-1 text-sm text-gray-600">
                  {message.startsWith('Agent:') ? 'You' : 'Homeowner'}
                </div>
                <div className="text-gray-800">
                  {message.split(': ')[1]}
                </div>
              </div>
            ))}
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
      </div>
    </div>
  );
};

export default VoicePracticeApp;