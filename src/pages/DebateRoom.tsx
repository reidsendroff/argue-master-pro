import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Volume2, VolumeX, Send, Trophy, AlertCircle, LogOut, BarChart3, Target, Zap, Crown, TrendingUp, CheckCircle, XCircle, Flame, Shield, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DebateState {
  topic: string;
  side: string;
  persona: string;
  difficulty: string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  score?: {
    clarity: number;
    logic: number;
    structure: number;
    fillerWords: number;
  };
}

const DebateRoom = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const state = location.state as DebateState;
  
  const [debateId, setDebateId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lockedVoice, setLockedVoice] = useState<{voiceId: string, provider: string} | null>(null);
  const [userProfile, setUserProfile] = useState<{total_debates: number, win_rate: number, elo: number, level: string} | null>(null);
  const [liveAnalytics, setLiveAnalytics] = useState({
    structure: 0,
    evidenceQuality: 0,
    confidence: 0,
    persuasionPower: 0
  });
  const [issues, setIssues] = useState<string[]>([]);
  const [coachTip, setCoachTip] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const initializeDebate = async () => {
      console.log('DebateRoom mounted - User:', user ? 'authenticated' : 'not authenticated', 'Loading:', loading);
      console.log('DebateRoom mounted - State:', state);
      
      // Wait for auth to load
      if (loading) {
        console.log('Auth still loading, waiting...');
        return;
      }
      
      // Check authentication
      if (!user) {
        console.log('No user, redirecting to /auth');
        navigate('/auth');
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_debates, win_rate, elo, level')
        .eq('user_id', user.id)
        .single();
      if (profile) setUserProfile(profile);

      if (!state) {
        console.log('No state, redirecting to /topics');
        navigate('/topics');
        return;
      }
      
      // Check if there's an existing debate with these parameters
      const { data: existingDebates } = await supabase
        .from('debates')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic', state.topic)
        .eq('side', state.side)
        .eq('persona', state.persona)
        .eq('difficulty', state.difficulty)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingDebates && existingDebates.length > 0) {
        // Load existing debate
        const debate = existingDebates[0];
        setDebateId(debate.id);
        console.log('Loading existing debate:', debate.id);

        // Load debate turns
        const { data: turns } = await supabase
          .from('debate_turns')
          .select('*')
          .eq('debate_id', debate.id)
          .order('turn_number', { ascending: true });

        if (turns && turns.length > 0) {
          const loadedMessages: Message[] = [];
          let loadedUserScore = 0;
          let loadedAiScore = 0;
          let turnCount = 0;

          turns.forEach(turn => {
            // Add AI message
            if (turn.ai_text) {
              const aiScore = turn.score_clarity ? {
                clarity: turn.score_clarity,
                logic: turn.score_logic!,
                structure: turn.score_structure!,
                fillerWords: 100
              } : undefined;
              
              loadedMessages.push({
                role: 'ai',
                content: turn.ai_text,
                score: aiScore
              });
              
              if (aiScore) {
                loadedAiScore += (aiScore.clarity + aiScore.logic + aiScore.structure) / 3;
              }
            }
            
            // Add user message
            if (turn.user_text) {
              turnCount++;
              const userScore = turn.score_clarity ? {
                clarity: turn.score_clarity,
                logic: turn.score_logic!,
                structure: turn.score_structure!,
                fillerWords: 100
              } : undefined;
              
              loadedMessages.push({
                role: 'user',
                content: turn.user_text,
                score: userScore
              });
              
              if (userScore) {
                loadedUserScore += (userScore.clarity + userScore.logic + userScore.structure) / 3;
              }
            }
          });

          setMessages(loadedMessages);
          setTotalScore(loadedUserScore);
          setAiScore(loadedAiScore);
          setRound(turnCount + 1);
          
          toast({
            title: "Debate Resumed",
            description: `Loaded ${turnCount} previous turn(s)`,
          });
        }
      } else {
        // Create new debate
        const { data: newDebate, error } = await supabase
          .from('debates')
          .insert({
            user_id: user.id,
            topic: state.topic,
            side: state.side,
            persona: state.persona,
            difficulty: state.difficulty,
            total_score: 0
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating debate:', error);
          toast({
            title: "Error",
            description: "Failed to create debate session",
            variant: "destructive"
          });
          return;
        }

        setDebateId(newDebate.id);
        console.log('Created new debate:', newDebate.id);

        // AI makes opening statement (no scoring on intro)
        const openingStatement = getPersonaOpening();
        setMessages([{
          role: 'ai',
          content: openingStatement
        }]);

        // Save opening statement to database
        await supabase.from('debate_turns').insert({
          debate_id: newDebate.id,
          turn_number: 0,
          ai_text: openingStatement
        });
        
        if (isSoundOn) {
          speakText(openingStatement);
        }
      }
      
      // Set initial coach tip based on difficulty
      const tips: Record<string, string> = {
        beginner: "Start with a clear claim and support it with reasoning.",
        intermediate: "Build structured arguments with evidence and counterpoints.",
        expert: "Anticipate counter-arguments and pre-emptively address them.",
        hell: "Every claim will be fact-checked. Use specific sources!"
      };
      setCoachTip(tips[state?.difficulty] || tips.intermediate);
    };

    initializeDebate();
  }, [user, loading, state, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getPersonaOpening = () => {
    const personaIntros: Record<string, string> = {
      obama: `Let me be clear about "${state?.topic}". I respect your position — but I believe you're on the wrong side of this argument. Make your case, and I'll show you why the evidence points elsewhere.`,
      shapiro: `"${state?.topic}" — okay, let's get into it. Here's the problem with your position: the facts don't support it. I'll give you exactly one chance to prove me wrong. Go.`,
      hitchens: `"${state?.topic}" — how delightfully misguided of you to argue that side. I've read the literature, studied the history, and I can tell you with some confidence: you're wrong. Elegantly, perhaps irreversibly wrong. Proceed.`,
      peterson: `The question of "${state?.topic}" is far deeper than you may realize. You're ignoring ancient patterns of meaning here. Before you argue, ask yourself: do you truly understand the underlying structure of what you're defending?`,
      aoc: `We need to talk about "${state?.topic}" — because real people's lives are affected by this. I'm going to challenge your position on moral and practical grounds. What's your opening argument?`,
      socrates: `Ah, you've chosen to argue "${state?.topic}". Fascinating. But tell me — do you truly understand what you're claiming? Let us begin, and I suspect we'll find some contradictions worth examining.`,
      trump: `"${state?.topic}" — look, everybody's talking about it. And I'm going to show you why your position is, frankly, a total disaster. Nobody knows more about this than me, believe me. Make your argument. Let's see what you've got.`,
      analyst: `On the question of "${state?.topic}", let's set aside emotion and work with the data. I'll be arguing the opposing position using evidence and structured logic. Your move.`,
      professor: `I'll be taking the opposing position on "${state?.topic}". Present your claim clearly, support it with reasoning, and I'll engage you directly. Logic and structure will determine who wins this.`,
      youtuber: `OKAY OKAY — "${state?.topic}" — this is WILD. Your take is probably going to be bad and I'm absolutely here for it. Drop your argument, let's GO. Chat, they're about to say something crazy.`,
    };
    return personaIntros[state?.persona] || personaIntros.professor;
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const speakText = async (text: string, preparedAudio?: HTMLAudioElement) => {
    if (!isSoundOn) return;
    
    setIsAiSpeaking(true);
    try {
      console.log('Generating speech for:', text.substring(0, 50));
      console.log('Using persona:', state?.persona, 'difficulty:', state?.difficulty);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text, 
          persona: state?.persona,
          difficulty: state?.difficulty,
          useElevenLabs: lockedVoice?.provider === 'elevenlabs',
          forceVoiceId: lockedVoice?.voiceId
        }
      });

      if (error) {
        console.error('TTS API error:', error);
        throw error;
      }

      if (data.audioContent) {
        console.log(`Using ${data.provider} voice: ${data.voiceName} (ID: ${data.voiceId}) at rate: ${data.speakingRate}`);
        
        // Lock the exact voice ID and provider that worked on first successful call
        if (!lockedVoice && data.voiceId && data.provider) {
          setLockedVoice({ voiceId: data.voiceId, provider: data.provider });
          console.log('Locked voice for this debate:', data.voiceId, data.voiceName, 'Provider:', data.provider);
        }
        try {
          const binaryString = atob(data.audioContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          
          console.log('Audio blob created, size:', blob.size);
          
          // Use prepared audio if available (mobile), otherwise create new one
          const audio = preparedAudio || new Audio();
          
          // Clean up old audio
          if (audioRef.current && audioRef.current !== audio) {
            audioRef.current.pause();
            audioRef.current.src = '';
          }
          
          audioRef.current = audio;
          audio.preload = 'auto';
          audio.src = url; // Set source immediately
          
          audio.onended = () => {
            console.log('Audio playback ended');
            setIsAiSpeaking(false);
            URL.revokeObjectURL(url);
          };
          
          audio.onerror = (e) => {
            console.error('Audio playback error:', e, audio.error);
            setIsAiSpeaking(false);
            URL.revokeObjectURL(url);
          };
          
          try {
            console.log('Attempting to play audio...');
            await audio.play();
            console.log('Audio playing successfully');
          } catch (playError: any) {
            console.error('Play error:', playError);
            setIsAiSpeaking(false);
            URL.revokeObjectURL(url);
            
            // Specific error handling
            if (playError.name === 'NotAllowedError') {
              console.log('NotAllowedError: Mobile browser blocked autoplay');
            }
            toast({
              title: "Audio Playback Issue",
              description: "Couldn't play audio. Make sure sound is enabled.",
              variant: "destructive"
            });
          }
        } catch (conversionError) {
          console.error('Audio conversion error:', conversionError);
          throw new Error('Failed to convert audio data');
        }
      }
    } catch (error) {
      console.error('Speech error:', error);
      setIsAiSpeaking(false);
      toast({
        title: "Speech Error",
        description: error instanceof Error ? error.message : "Could not generate audio",
        variant: "destructive"
      });
    }
  };

  const analyzeArgument = (text: string) => {
    // Enhanced dynamic scoring algorithm
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = wordCount / (sentenceCount || 1);
    
    // Clarity Score (0-100) - Based on readability and coherence
    let clarityScore = 30; // Start with base score for any argument
    // Good sentence length (15-25 words per sentence is optimal)
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 30) {
      clarityScore += 25;
    } else if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 35) {
      clarityScore += 15;
    }
    // Coherence markers
    const coherenceMarkers = /\b(specifically|particularly|especially|notably|importantly|clearly|essentially|measurable|significant)\b/gi;
    clarityScore += Math.min(25, (text.match(coherenceMarkers) || []).length * 10);
    // Proper punctuation and capitalization
    if (/[.!?]$/.test(text.trim())) clarityScore += 10;
    if (/^[A-Z]/.test(text.trim())) clarityScore += 10;
    
    // Logic Score (0-100) - Based on reasoning and evidence
    let logicScore = 25; // Start with base score
    // Evidence and citations (more flexible patterns)
    const evidencePatterns = /\b(study|research|data|statistics|according to|research shows|evidence|studies|found|demonstrates|proves|measurable|impact|increases|decreases|shows|indicates)\b/gi;
    const evidenceMatches = (text.match(evidencePatterns) || []).length;
    logicScore += Math.min(30, evidenceMatches * 8);
    
    // Logical connectors (expanded)
    const logicalConnectors = /\b(because|therefore|thus|hence|consequently|as a result|this means|this shows|which|that|due to|since)\b/gi;
    const connectorMatches = (text.match(logicalConnectors) || []).length;
    logicScore += Math.min(25, connectorMatches * 7);
    
    // Cause-effect reasoning (expanded)
    const causation = /\b(causes|leads to|results in|due to|caused by|contributes to|affects|impacts|increases|creates|produces|generates)\b/gi;
    const causationMatches = (text.match(causation) || []).length;
    logicScore += Math.min(20, causationMatches * 10);
    
    // Multiple distinct claims (strong logic indicator)
    if (sentenceCount >= 3 && wordCount > 40) logicScore += 15;
    
    // Structure Score (0-100) - Based on argument organization
    let structureScore = 35; // Start with base score for well-formed text
    
    // Multiple sentences showing organization
    if (sentenceCount >= 3) structureScore += 20;
    if (sentenceCount >= 4) structureScore += 10;
    
    // Transitions and sequencing (more flexible)
    const transitions = /\b(first|second|third|next|then|furthermore|moreover|additionally|also|in addition|finally|another)\b/gi;
    structureScore += Math.min(20, (text.match(transitions) || []).length * 12);
    
    // Conclusions or summary statements
    if (/\b(therefore|thus|in conclusion|to summarize|overall|in summary|this shows|this proves|generation|result)\b/i.test(text)) structureScore += 15;
    
    // Penalties
    const fillerWords = (text.match(/\b(um|uh|like|you know|basically|literally|kind of|sort of)\b/gi) || []).length;
    const fillerPenalty = Math.min(15, fillerWords * 5);
    clarityScore = Math.max(0, clarityScore - fillerPenalty);
    
    // Overgeneralization penalty (reduced)
    const overgeneralizations = (text.match(/\b(always|never|everyone|nobody|every single)\b/gi) || []).length;
    logicScore = Math.max(0, logicScore - (overgeneralizations * 5));
    
    // Normalize to 0-100 range
    clarityScore = Math.min(100, Math.max(0, clarityScore));
    logicScore = Math.min(100, Math.max(0, logicScore));
    structureScore = Math.min(100, Math.max(0, structureScore));
    
    // Update live analytics
    const hasEvidence = /\b(study|research|data|statistics|according to|research shows)\b/i.test(text);
    const hasStructure = /\b(first|second|finally|in conclusion|therefore|furthermore|however)\b/i.test(text);
    const hasSources = /\b(\d{4}|university|journal|professor|expert|scientist)\b/i.test(text);
    const hasLogicalFallacy = /\b(always|never|everyone|nobody|obviously|clearly)\b/i.test(text);
    
    const newAnalytics = {
      structure: Math.min(10, Math.round((hasStructure ? 6 : 3) + (sentenceCount >= 3 ? 2 : 0) + (wordCount > 30 ? 2 : 0))),
      evidenceQuality: Math.min(10, Math.round((hasEvidence ? 5 : 1) + (hasSources ? 4 : 0) + (hasLogicalFallacy ? -2 : 1))),
      confidence: Math.min(100, Math.round(60 + (wordCount > 50 ? 20 : wordCount > 30 ? 10 : 0) + (fillerWords === 0 ? 20 : -fillerWords * 5))),
      persuasionPower: Math.min(100, Math.round(50 + (hasEvidence ? 20 : 0) + (hasStructure ? 15 : 0) + (hasSources ? 15 : 0)))
    };
    setLiveAnalytics(newAnalytics);
    
    // Detect issues
    const detectedIssues: string[] = [];
    if (fillerWords > 3) detectedIssues.push('Too many filler words detected');
    if (!hasEvidence && state?.difficulty !== 'beginner') detectedIssues.push('Missing evidence or sources');
    if (hasLogicalFallacy && overgeneralizations > 2) detectedIssues.push('Overgeneralizations detected - avoid "always/never"');
    if (wordCount < 20) detectedIssues.push('Argument too brief - expand your points');
    if (!hasStructure && wordCount > 40) detectedIssues.push('Add transitions to improve structure');
    setIssues(detectedIssues);
    
    return {
      clarity: Math.round(clarityScore),
      logic: Math.round(logicScore),
      structure: Math.round(structureScore),
      fillerWords: Math.max(0, 100 - (fillerWords * 10))
    };
  };

  const generateAiResponse = async (userMessage: string, score: any) => {
    try {
      const conversationHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      const { data, error } = await supabase.functions.invoke('debate-ai', {
        body: {
          messages: conversationHistory,
          persona: state?.persona,
          difficulty: state?.difficulty
        }
      });

      if (error) throw error;

      return data.response;
    } catch (error) {
      console.error('AI response error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      return "I apologize, but I'm having trouble responding right now. Please try again.";
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !debateId) return;

    // Pre-create audio element during user interaction (critical for mobile)
    let preparedAudio: HTMLAudioElement | undefined;
    if (isSoundOn) {
      preparedAudio = new Audio();
      console.log('Pre-created audio element for mobile compatibility');
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: userInput
    };
    
    const score = analyzeArgument(userInput);
    userMessage.score = score;
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    const scoreValue = Object.values(score).reduce((a, b) => a + b, 0) / 4;
    setTotalScore(prev => prev + scoreValue);

    // Generate AI response
    const aiResponse = await generateAiResponse(userInput, score);
    
    // Score the AI response
    const aiResponseScore = analyzeArgument(aiResponse);
    const aiMessage: Message = {
      role: 'ai',
      content: aiResponse,
      score: aiResponseScore
    };
    
    setMessages(prev => [...prev, aiMessage]);
    
    // Update AI total score
    const aiScoreValue = Object.values(aiResponseScore).reduce((a, b) => a + b, 0) / 4;
    setAiScore(prev => prev + aiScoreValue);
    
    // Save turn to database
    await supabase.from('debate_turns').insert({
      debate_id: debateId,
      turn_number: round,
      user_text: userInput,
      ai_text: aiResponse,
      score_clarity: score.clarity,
      score_logic: score.logic,
      score_structure: score.structure,
      filler_words: 0
    });
    
    if (isSoundOn && preparedAudio) {
      await speakText(aiResponse, preparedAudio);
    } else {
      setIsAiSpeaking(false);
    }
    
    setRound(prev => prev + 1);

    // End debate after 5 rounds
    if (round >= 5) {
      setTimeout(() => {
        const finalUserScore = totalScore / round;
        const finalAiScore = aiScore / round;
        navigate('/results', {
          state: {
            messages,
            totalScore: finalUserScore,
            aiScore: finalAiScore,
            didUserWin: finalUserScore > finalAiScore,
            topic: state?.topic,
            persona: state?.persona,
            difficulty: state?.difficulty,
          }
        });
      }, 2000);
    }
  };

  const toggleMic = async () => {
    if (!isMicOn) {
      // Pre-create audio for AI response (mobile compatibility)
      if (isSoundOn) {
        pendingAudioRef.current = new Audio();
        console.log('Pre-created pending audio for voice response');
      }
      
      try {
        console.log('Starting voice recording...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('Recording stopped, processing...');
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processVoiceInput(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsMicOn(true);
        setIsRecording(true);
        
        toast({
          title: "Listening",
          description: "Speak now... Click again when done",
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
        setIsMicOn(false);
        setIsRecording(false);
      }
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    if (!debateId) return;
    setIsProcessing(true);
    try {
      // Step 1: Transcribe audio
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
              console.log('Transcribed:', transcriptData.text);
              
              // Step 2: Add user message
              const userMessage: Message = {
                role: 'user',
                content: transcriptData.text
              };
              
              const score = analyzeArgument(transcriptData.text);
              userMessage.score = score;
              
              setMessages(prev => [...prev, userMessage]);
              setUserInput('');
              setTotalScore(prev => prev + Object.values(score).reduce((a, b) => a + b, 0) / 4);

              // Step 3: Generate AI response
              console.log('Generating AI response...');
              const aiResponse = await generateAiResponse(transcriptData.text, score);
              
              // Score the AI response
              const aiResponseScore = analyzeArgument(aiResponse);
              const aiMessage: Message = {
                role: 'ai',
                content: aiResponse,
                score: aiResponseScore
              };
              
              setMessages(prev => [...prev, aiMessage]);
              
              // Update AI total score
              const aiScoreValue = Object.values(aiResponseScore).reduce((a, b) => a + b, 0) / 4;
              setAiScore(prev => prev + aiScoreValue);
              
              // Save turn to database
              await supabase.from('debate_turns').insert({
                debate_id: debateId,
                turn_number: round,
                user_text: transcriptData.text,
                ai_text: aiResponse,
                score_clarity: score.clarity,
                score_logic: score.logic,
                score_structure: score.structure,
                filler_words: 0
              });
              
              // Step 4: Speak AI response with prepared audio
              if (isSoundOn && pendingAudioRef.current) {
                await speakText(aiResponse, pendingAudioRef.current);
                pendingAudioRef.current = null;
              }
              
              setRound(prev => prev + 1);
              
              toast({
                title: "Turn Complete",
                description: "Ready for your next argument",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!state) return null;

  const userScoreDisplay = Math.round(totalScore / round || 0);
  const aiScoreDisplay = Math.round(aiScore / round || 0);
  const scoreStatus = userScoreDisplay > aiScoreDisplay ? 'Leading!' : userScoreDisplay < aiScoreDisplay ? 'Behind' : 'Tied!';

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur p-2 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{state.topic}</h2>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>You: {state.side}</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>AI: {state.persona}</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>{state.difficulty}</span>
              </div>
            </div>
          </div>
          
          {/* Score Display */}
          <Card className="px-3 py-1.5 bg-card/80 border-2">
            <div className="flex items-center gap-3 text-xs">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">You</div>
                <div className="text-lg font-bold text-primary">{userScoreDisplay}</div>
              </div>
              <div className="text-base font-bold text-muted-foreground">×</div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">AI</div>
                <div className="text-lg font-bold text-destructive">{aiScoreDisplay}</div>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <Zap className="w-3 h-3" />
                <span className="font-semibold">{scoreStatus}</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-2 items-center">
            {isMicOn && (
              <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 border border-destructive/20 rounded-md animate-pulse">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                <span className="text-xs font-medium text-destructive">Recording... Click mic to stop</span>
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 ${isMicOn ? 'bg-destructive/10 border-destructive/50 hover:bg-destructive/20' : ''}`}
                    onClick={toggleMic}
                    disabled={isProcessing || isAiSpeaking}
                  >
                    {isMicOn ? <Mic className="w-3 h-3 text-destructive animate-pulse" /> : <MicOff className="w-3 h-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {isMicOn ? "Click to stop recording" : "Click to start voice input"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsSoundOn(!isSoundOn)}
            >
              {isSoundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/topics')}
              className="hidden md:flex h-8 text-xs px-3"
            >
              New Debate
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Stats Bar */}
      <div className="block lg:hidden border-b border-border bg-card/30 px-3 py-2 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div>
            <p className="text-muted-foreground">Structure</p>
            <p className="font-bold text-primary">{liveAnalytics.structure}/10</p>
          </div>
          <div>
            <p className="text-muted-foreground">Evidence</p>
            <p className="font-bold text-primary">{liveAnalytics.evidenceQuality}/10</p>
          </div>
          <div>
            <p className="text-muted-foreground">Confidence</p>
            <p className="font-bold text-primary">{liveAnalytics.confidence}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Persuasion</p>
            <p className="font-bold text-primary">{liveAnalytics.persuasionPower}%</p>
          </div>
        </div>
      </div>

      {/* Main Content - Fixed Height */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Messages - Center - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((message, idx) => (
            <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <Card className={`max-w-[85%] p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card border-2 border-border'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                {message.score && (
                  <div className={`mt-2 pt-2 border-t ${
                    message.role === 'user' 
                      ? 'border-primary-foreground/20' 
                      : 'border-border'
                  } space-y-1 text-xs`}>
                    <div className="flex justify-between">
                      <span>Clarity:</span>
                      <span className="font-semibold">{message.score.clarity}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Logic:</span>
                      <span className="font-semibold">{message.score.logic}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Structure:</span>
                      <span className="font-semibold">{message.score.structure}/100</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start animate-fade-in">
              <Card className="p-3 bg-card border-2 border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <span>Processing...</span>
                </div>
              </Card>
            </div>
          )}
          {isAiSpeaking && (
            <div className="flex justify-start animate-fade-in">
              <Card className="p-3 bg-card border-2 border-border">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                </div>
              </Card>
            </div>
          )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Analytics Sidebar - Right - Scrollable */}
        <div className="hidden lg:block w-80 border-l border-border bg-card/30 overflow-y-auto p-3 space-y-2.5">
          {/* Live Analytics */}
          <Card className="p-2.5 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <h3 className="font-semibold text-xs">Live Analytics</h3>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">Structure</span>
                  <span className="font-semibold text-primary">{liveAnalytics.structure}/10</span>
                </div>
                <Progress value={liveAnalytics.structure * 10} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">Evidence Quality</span>
                  <span className="font-semibold text-primary">{liveAnalytics.evidenceQuality}/10</span>
                </div>
                <Progress value={liveAnalytics.evidenceQuality * 10} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-semibold text-primary">{liveAnalytics.confidence}%</span>
                </div>
                <Progress value={liveAnalytics.confidence} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">Persuasion Power</span>
                  <span className="font-semibold text-primary">{liveAnalytics.persuasionPower}%</span>
                </div>
                <Progress value={liveAnalytics.persuasionPower} className="h-1.5" />
              </div>
            </div>
          </Card>

          {/* Issues Detected */}
          <Card className="p-2.5 border-2 border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <h3 className="font-semibold text-xs">Issues Detected</h3>
            </div>
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 text-[10px] text-green-600 dark:text-green-400">
                <CheckCircle className="w-3 h-3" />
                <span>Clean argument so far!</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px] text-destructive">
                    <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Coach Tip */}
          <Card className="p-2.5 border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-semibold text-xs">Coach Tip</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">{coachTip}</p>
          </Card>

          {/* Your Profile */}
          <Card className="p-2.5 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-3.5 h-3.5 text-primary" />
              <h3 className="font-semibold text-xs">Your Profile</h3>
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Debates</span>
                <span className="font-semibold">{userProfile?.total_debates ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {userProfile?.win_rate ? `${Math.round(userProfile.win_rate)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Level</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{userProfile?.level || 'Novice'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ELO Rating</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{userProfile?.elo ?? 1200}</span>
              </div>
            </div>
          </Card>

          {/* Round Info */}
          <Card className="p-2.5 border-2">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">Round Progress</span>
              <span className="font-semibold">{round}/5</span>
            </div>
            <Progress value={(round / 5) * 100} className="h-1.5" />
          </Card>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/50 backdrop-blur p-3">
        <div className="max-w-7xl mx-auto flex gap-2">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your argument..."
            className="min-h-[50px] max-h-[100px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!userInput.trim() || isAiSpeaking}
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary h-[50px] px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DebateRoom;
