import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ElevenLabs persona-to-voice mapping - COMEDIC & CHARACTER-FILLED VOICES
const PERSONA_VOICE_MAP: Record<string, { primary: string; backup: string; voiceId: string; backupId: string }> = {
  'obama': { 
    primary: 'Adam', 
    backup: 'Patrick',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Warm but slightly exaggerated
    backupId: 'ODq5zmih8GrVes37Dizd'
  },
  'shapiro': { 
    primary: 'Fin', 
    backup: 'Sam',
    voiceId: 'D38z5RcWu1voky8WS1ja', // Fast, clipped, comedic speed
    backupId: 'yoZ06aMxZJJ28mfd3POQ'
  },
  'hitchens': { 
    primary: 'Richard', 
    backup: 'Patrick',
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // Dramatic British roastmaster
    backupId: 'ODq5zmih8GrVes37Dizd'
  },
  'peterson': { 
    primary: 'Patrick', 
    backup: 'Adam',
    voiceId: 'ODq5zmih8GrVes37Dizd', // Soft, philosophical, slightly exaggerated
    backupId: 'pNInz6obpgDQGcFmaJgB'
  },
  'aoc': { 
    primary: 'Jess', 
    backup: 'Sarah',
    voiceId: 'cgSgspJ2msm6clMCkdW9', // High-energy motivational parody
    backupId: 'EXAVITQu4vr4xnSDxMaL'
  },
  'socrates': { 
    primary: 'Elli', 
    backup: 'Adam',
    voiceId: 'MF3mGyEYCl7XYWbV9V6O', // Old wise man with Greek hint
    backupId: 'pNInz6obpgDQGcFmaJgB'
  },
  'trump': { 
    primary: 'Brian', // Deep, gravelly, commanding presence - rally-style theatrical
    backup: 'George',
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - deep American male, gravelly, assertive
    backupId: 'JBFqnCBsd6RMkjVDRZzb' // George - backup deep male voice
  },
  'analyst': { 
    primary: 'Sam', 
    backup: 'Adam',
    voiceId: 'yoZ06aMxZJJ28mfd3POQ', // Deadpan tech guy, robotic humor
    backupId: 'pNInz6obpgDQGcFmaJgB'
  },
  'professor': { 
    primary: 'Sarah', 
    backup: 'Jess',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Wholesome teacher, soft humor
    backupId: 'cgSgspJ2msm6clMCkdW9'
  },
  'youtuber': { 
    primary: 'Callum', // Scottish/Celtic male voice - comedic hype beast
    backup: 'Antoni',
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - Scottish male accent
    backupId: 'ErXwobaYiN019PkySvjV'
  },
  'default': { 
    primary: 'Adam', 
    backup: 'Sarah',
    voiceId: 'pNInz6obpgDQGcFmaJgB', 
    backupId: 'EXAVITQu4vr4xnSDxMaL'
  }
}

// Calculate speaking rate based on difficulty and persona (FUN & ENTERTAINING)
const calculateSpeakingRate = (difficulty: string, persona: string): number => {
  const diff = difficulty || 'intermediate'
  
  // Persona-specific rates by difficulty - MORE CHAOTIC AND FUN
  const rateMap: Record<string, Record<string, number>> = {
    'obama': { beginner: 1.00, intermediate: 1.05, hard: 1.10, hell: 1.15 },
    'shapiro': { beginner: 1.20, intermediate: 1.25, hard: 1.30, hell: 1.40 },
    'hitchens': { beginner: 1.00, intermediate: 1.05, hard: 1.10, hell: 1.15 },
    'peterson': { beginner: 0.95, intermediate: 1.00, hard: 1.05, hell: 1.10 },
    'aoc': { beginner: 1.10, intermediate: 1.15, hard: 1.20, hell: 1.25 },
    'socrates': { beginner: 0.90, intermediate: 0.95, hard: 1.05, hell: 1.10 },
    'trump': { beginner: 0.95, intermediate: 1.00, hard: 1.05, hell: 1.10 }, // Deliberate pacing with dramatic pauses
    'analyst': { beginner: 1.00, intermediate: 1.05, hard: 1.10, hell: 1.15 },
    'professor': { beginner: 0.95, intermediate: 1.00, hard: 1.05, hell: 1.10 },
    'youtuber': { beginner: 1.20, intermediate: 1.30, hard: 1.35, hell: 1.45 } // IRISH HYPE BEAST MODE
  }

  const personaRates = rateMap[persona] || { beginner: 1.00, intermediate: 1.05, hard: 1.10, hell: 1.15 }
  const rate = personaRates[diff] || personaRates.intermediate

  return Math.max(0.5, Math.min(2.0, rate)) // Clamp between 0.5 and 2.0
}

// OpenAI voice mapping (fallback)
const OPENAI_VOICE_MAP: Record<string, string> = {
  'obama': 'onyx',
  'shapiro': 'onyx',
  'hitchens': 'onyx',
  'peterson': 'onyx',
  'aoc': 'nova',
  'socrates': 'onyx',
  'trump': 'onyx', // Deep, confident male voice
  'analyst': 'echo',
  'professor': 'alloy',
  'youtuber': 'fable',
  'default': 'onyx'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Validate API keys exist
    const openAIKey = Deno.env.get('OPENAI_API_KEY')
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY')
    
    if (!openAIKey) {
      console.error('OPENAI_API_KEY is not configured')
      return new Response(
        JSON.stringify({ 
          error: 'TTS service not configured. Please add your OpenAI API key.', 
          code: 'MISSING_API_KEY' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body: { text?: string; persona?: string; difficulty?: string; useElevenLabs?: boolean; forceVoiceId?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { text, persona, difficulty, useElevenLabs = false, forceVoiceId } = body

    // Validate required fields
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a non-empty string', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limit text length to prevent abuse
    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Text too long. Maximum 5000 characters.', code: 'TEXT_TOO_LONG' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Generating speech for text:', text.substring(0, 50))
    console.log('Persona:', persona, 'Difficulty:', difficulty, 'Use ElevenLabs:', useElevenLabs)
    console.log('Force voice ID:', forceVoiceId)

    // Get voice mapping and calculate speaking rate
    const personaKey = persona || 'default'
    const voiceMapping = PERSONA_VOICE_MAP[personaKey] || PERSONA_VOICE_MAP['default']
    const speakingRate = calculateSpeakingRate(difficulty || 'intermediate', personaKey)
    
    console.log(`Voice: ${voiceMapping.primary} (backup: ${voiceMapping.backup})`)
    console.log(`Speaking rate: ${speakingRate}`)

    // Try ElevenLabs first if explicitly requested and API key is available
    if (useElevenLabs && elevenLabsKey) {
      // If we have a forced voice ID, check if it's an OpenAI voice first
      const openAIVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
      if (forceVoiceId && openAIVoices.includes(forceVoiceId)) {
        console.log('Forced voice is OpenAI voice, skipping ElevenLabs');
        // Skip to OpenAI section below
      } else {
        // If we have a forced voice ID, use only that one. Otherwise try primary then backup.
        const voiceIdsToTry = forceVoiceId 
          ? [forceVoiceId]
          : [voiceMapping.voiceId, voiceMapping.backupId];
      
        for (const voiceId of voiceIdsToTry) {
          try {
            console.log('Attempting ElevenLabs with voice ID:', voiceId)

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
              method: 'POST',
              headers: {
                'xi-api-key': elevenLabsKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: text,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: {
                  // Trump: ultra-low stability (0.15) for maximum theatrical expression, rally-style delivery
                  stability: personaKey === 'trump' ? 0.15 : (personaKey === 'youtuber' || personaKey === 'shapiro') ? 0.3 : 0.4,
                  similarity_boost: personaKey === 'trump' ? 0.6 : 0.85, // Medium for Trump to avoid policy blocks
                  style: (personaKey === 'youtuber' || personaKey === 'shapiro' || personaKey === 'trump') ? 1.0 : 0.75,
                  use_speaker_boost: true,
                  speaking_rate: speakingRate
                }
              }),
            })

            if (response.ok) {
              console.log(`ElevenLabs success with voice ID: ${voiceId}`)
              const arrayBuffer = await response.arrayBuffer()
              const uint8Array = new Uint8Array(arrayBuffer)
              
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
              }
              
              const base64Audio = btoa(binary)
              const voiceName = voiceId === voiceMapping.voiceId ? voiceMapping.primary : voiceMapping.backup;
              return new Response(
                JSON.stringify({ 
                  audioContent: base64Audio, 
                  provider: 'elevenlabs',
                  voiceId: voiceId,
                  voiceName: voiceName,
                  speakingRate
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            } else {
              const errorText = await response.text()
              console.log(`Voice ${voiceId} failed: ${errorText}`)
              
              // Check for quota/rate limit errors
              if (response.status === 429 || response.status === 401) {
                console.log('ElevenLabs quota/auth issue, falling back to OpenAI')
                break // Fall through to OpenAI
              }
              
              // Try backup voice if this was primary
              if (voiceId === voiceMapping.voiceId) {
                continue
              }
            }
          } catch (elevenLabsError) {
            console.log(`Voice ${voiceId} error:`, elevenLabsError)
            if (voiceId === voiceMapping.voiceId) {
              continue
            }
          }
        }
        
        // If we had a forced voice ID and it failed, log but continue to OpenAI
        if (forceVoiceId) {
          console.log('Forced ElevenLabs voice failed, falling back to OpenAI')
        } else {
          console.log('Both ElevenLabs voices failed, falling back to OpenAI')
        }
      }
    }

    // Use OpenAI (fallback)
    const openAIVoice = (forceVoiceId && ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(forceVoiceId))
      ? forceVoiceId 
      : (OPENAI_VOICE_MAP[personaKey] || OPENAI_VOICE_MAP['default']);
    console.log('Using OpenAI with voice:', openAIVoice, 'at speed:', speakingRate)
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: openAIVoice,
        response_format: 'mp3',
        speed: speakingRate
      }),
    })

    if (!response.ok) {
      let errorData: { error?: { message?: string; type?: string; code?: string } } = {}
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: { message: 'Unknown OpenAI error' } }
      }
      
      console.error('OpenAI TTS error:', errorData)
      
      // Handle specific error types
      const errorType = errorData.error?.type || ''
      const errorCode = errorData.error?.code || ''
      const errorMessage = errorData.error?.message || 'Speech generation failed'
      
      // Quota exceeded
      if (errorCode === 'insufficient_quota' || errorType === 'insufficient_quota') {
        return new Response(
          JSON.stringify({ 
            error: 'OpenAI quota exceeded. Please check your billing or update your API key.',
            code: 'QUOTA_EXCEEDED',
            provider: 'openai'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Rate limited
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limited. Please try again in a moment.',
            code: 'RATE_LIMITED',
            provider: 'openai'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Auth error
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid API key. Please update your OpenAI API key.',
            code: 'INVALID_API_KEY',
            provider: 'openai'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Generic error
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: 'TTS_FAILED',
          provider: 'openai'
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binary)

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio, 
        provider: 'openai',
        voiceId: openAIVoice,
        voiceName: openAIVoice,
        speakingRate
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('TTS function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
