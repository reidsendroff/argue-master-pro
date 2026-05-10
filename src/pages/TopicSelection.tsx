import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThumbsUp, ThumbsDown, Dice6, Sprout, Zap, Flame, Skull, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const POPULAR_TOPICS = [
  "AI will replace most knowledge workers in 10 years",
  "Social media does more harm than good",
  "Climate change requires immediate radical action",
  "Privacy is more important than security",
  "Universal basic income should be implemented globally",
  "Remote work is the future of employment",
  "Cryptocurrencies will replace traditional banking",
  "Free speech should have no limits",
];

const PERSONAS = [
  { 
    id: 'obama', 
    name: 'Obama', 
    emoji: '🎙️',
    description: 'Calm'
  },
  { 
    id: 'shapiro', 
    name: 'Shapiro', 
    emoji: '⚡',
    description: 'Rapid-fire facts'
  },
  { 
    id: 'hitchens', 
    name: 'Hitchens', 
    emoji: '🎭',
    description: 'Witty'
  },
  { 
    id: 'peterson', 
    name: 'Peterson', 
    emoji: '🧠',
    description: 'Deep philosophical'
  },
  { 
    id: 'aoc', 
    name: 'AOC', 
    emoji: '✊',
    description: 'Passionate'
  },
  { 
    id: 'socrates', 
    name: 'Socrates', 
    emoji: '🏛️',
    description: 'Questions everything'
  },
  { 
    id: 'trump', 
    name: 'Trump', 
    emoji: '🇺🇸',
    description: 'Rhetorical'
  },
  { 
    id: 'analyst', 
    name: 'Balanced Analyst', 
    emoji: '⚖️',
    description: 'Neutral'
  },
  { 
    id: 'professor', 
    name: 'Calm Professor', 
    emoji: '👨‍🏫',
    description: 'Patient'
  },
  { 
    id: 'youtuber', 
    name: 'Aggressive YouTuber', 
    emoji: '📹',
    description: 'Hot takes'
  },
];

const TopicSelection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<'for' | 'against' | 'surprise'>('for');
  const [selectedPersona, setSelectedPersona] = useState('analyst');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'expert' | 'hell'>('intermediate');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    console.log('TopicSelection - User:', user ? 'authenticated' : 'not authenticated', 'Loading:', loading);
  }, [user, loading]);

  const toggleMicForTopic = async () => {
    if (!isRecording) {
      try {
        console.log('Starting voice recording for topic...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        // Detect supported mime type for cross-browser compatibility
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        } else {
          mimeType = ''; // Let browser choose
        }
        
        console.log('Using mime type:', mimeType);
        const options = mimeType ? { mimeType } : undefined;
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('Recording stopped, processing...');
          const blobType = mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
          await processVoiceInput(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        
        toast({
          title: "Listening",
          description: "Speak your debate topic... Click again when done",
        });
      } catch (error) {
        console.error('Microphone error:', error);
        toast({
          title: "Microphone Error",
          description: "Could not access microphone. Please allow microphone permissions.",
          variant: "destructive"
        });
      }
    } else {
      if (mediaRecorderRef.current && isRecording) {
        console.log('Stopping recording...');
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      console.log('Transcribing audio...');
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      await new Promise((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];
            
            const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('speech-to-text', {
              body: { audio: base64Audio }
            });

            if (transcriptError) throw transcriptError;

            if (transcriptData.text) {
              console.log('Transcribed topic:', transcriptData.text);
              setCustomTopic(transcriptData.text);
              setSelectedTopic(''); // Clear dropdown selection
              
              toast({
                title: "Topic Captured",
                description: "Your debate topic has been transcribed!",
              });
            }
            resolve(null);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
      });
    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process voice input. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startDebate = () => {
    const topic = customTopic || selectedTopic;
    
    if (!topic) {
      toast({
        title: "Select a topic",
        description: "Please choose or enter a debate topic",
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to start a debate",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    
    const side = selectedPosition === 'surprise' 
      ? (Math.random() > 0.5 ? 'for' : 'against')
      : selectedPosition;
    
    navigate('/debate', { 
      state: { topic, side, persona: selectedPersona, difficulty } 
    });
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-6xl mx-auto space-y-2.5">
        
        {/* Position Selection */}
        <Card className="p-3 space-y-2 border-2 border-border/50 bg-card/30 backdrop-blur">
          <h2 className="text-base font-semibold text-foreground/80">Choose Your Position</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <button
              onClick={() => setSelectedPosition('for')}
              className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                selectedPosition === 'for'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${selectedPosition === 'for' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-semibold">For</span>
            </button>
            
            <button
              onClick={() => setSelectedPosition('against')}
              className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                selectedPosition === 'against'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }`}
            >
              <ThumbsDown className={`w-5 h-5 ${selectedPosition === 'against' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-semibold">Against</span>
            </button>
            
            <button
              onClick={() => setSelectedPosition('surprise')}
              className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                selectedPosition === 'surprise'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }`}
            >
              <Dice6 className={`w-5 h-5 ${selectedPosition === 'surprise' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-semibold">Surprise Me</span>
            </button>
          </div>
        </Card>

        {/* Difficulty Selection */}
        <Card className="p-3 space-y-2 border-2 border-border/50 bg-card/30 backdrop-blur">
          <h2 className="text-base font-semibold text-foreground/80">Difficulty Level</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <button
              onClick={() => setDifficulty('beginner')}
              className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                difficulty === 'beginner'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }`}
            >
              <Sprout className={`w-5 h-5 ${difficulty === 'beginner' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-xs font-semibold">Beginner</span>
            </button>
            
            <button
              onClick={() => setDifficulty('intermediate')}
              className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                difficulty === 'intermediate'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }`}
            >
              <Zap className={`w-5 h-5 ${difficulty === 'intermediate' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-xs font-semibold">Intermediate</span>
            </button>
            
            <button
              onClick={() => setDifficulty('expert')}
              className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                difficulty === 'expert'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }`}
            >
              <Flame className={`w-5 h-5 ${difficulty === 'expert' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-xs font-semibold">Expert</span>
            </button>
            
            <button
              onClick={() => setDifficulty('hell')}
              className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                difficulty === 'hell'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }`}
            >
              <Skull className={`w-5 h-5 ${difficulty === 'hell' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-xs font-semibold">Hell Mode</span>
            </button>
          </div>
        </Card>

        {/* AI Opponent Persona */}
        <Card className="p-3 space-y-2 border-2 border-border/50 bg-card/30 backdrop-blur">
          <h2 className="text-base font-semibold text-foreground/80">AI Opponent Persona</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {PERSONAS.map((persona) => (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(persona.id)}
                className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  selectedPersona === persona.id
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border bg-card/50 hover:border-primary/50'
                }`}
              >
                <span className="text-xl">{persona.emoji}</span>
                <div className="text-center">
                  <p className="font-semibold text-[11px]">{persona.name}</p>
                  <p className="text-[9px] text-muted-foreground">{persona.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Choose Your Topic */}
        <Card className="p-3 space-y-2 border-2 border-border/50 bg-card/30 backdrop-blur">
          <h2 className="text-base font-semibold text-foreground/80">Choose Your Topic</h2>
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-full bg-card/50 border-border">
              <SelectValue placeholder="Select a debate topic..." />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_TOPICS.map((topic, idx) => (
                <SelectItem key={idx} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Input
              placeholder="Or enter your own topic..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="bg-card/50 border-border pr-12"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMicForTopic}
              disabled={isProcessing}
              className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${
                isRecording ? 'bg-destructive text-destructive-foreground animate-pulse' : ''
              }`}
              title={isRecording ? "Stop recording" : "Speak your topic"}
            >
              {isRecording ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            </Button>
          </div>
        </Card>

        {/* Start Debate Button */}
        <Button 
          onClick={startDebate}
          className="w-full py-5 text-base font-semibold bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity"
          size="lg"
        >
          ⚔️ Start Debate 🔥
        </Button>
      </div>
    </div>
  );
};

export default TopicSelection;
