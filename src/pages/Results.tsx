import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, TrendingUp, AlertCircle, Sparkles, Home, Share2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { totalScore, aiScore, topic, messages, didUserWin, persona, difficulty } = location.state || {};

  if (!totalScore) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No debate results found</p>
          <Button onClick={() => navigate('/topics')}>Start New Debate</Button>
        </Card>
      </div>
    );
  }

  const userAvg = Math.round(totalScore);
  const aiAvg = aiScore ? Math.round(aiScore) : null;
  const margin = aiAvg !== null ? userAvg - aiAvg : null;

  const performance = userAvg >= 80 ? 'excellent' : userAvg >= 60 ? 'good' : 'needs-improvement';

  const performanceMessages = {
    excellent: {
      title: didUserWin ? '🏆 YOU DOMINATED!' : '🏆 Outstanding Performance!',
      message: didUserWin
        ? `You crushed the debate and outscored ${persona || 'the AI'} by ${margin} points. Elite-level argumentation.`
        : `You argued brilliantly at ${userAvg}/100. The AI edged you out — rematch time?`,
      color: 'text-debate-win',
    },
    good: {
      title: didUserWin ? '🔥 You Won!' : '👏 Good Effort!',
      message: didUserWin
        ? `Solid win with ${userAvg}/100. You out-argued ${persona || 'the AI'} — keep pushing.`
        : `Close match. ${aiAvg !== null ? `AI scored ${aiAvg} vs your ${userAvg}.` : ''} One more debate and you're there.`,
      color: 'text-primary',
    },
    'needs-improvement': {
      title: didUserWin ? '✅ You Won!' : '💪 Keep Practicing!',
      message: didUserWin
        ? `A win is a win. Your ${userAvg}/100 was enough to take it. Now push that score higher.`
        : `Every debate makes you sharper. Focus on structure and evidence next round.`,
      color: 'text-debate-neutral',
    },
  };

  const feedback = performanceMessages[performance];

  const userScores = messages
    ?.filter((m: any) => m.role === 'user' && m.score)
    .map((m: any) => m.score) || [];

  const avgClarity = userScores.length ? Math.round(userScores.reduce((a: number, s: any) => a + s.clarity, 0) / userScores.length) : 0;
  const avgLogic = userScores.length ? Math.round(userScores.reduce((a: number, s: any) => a + s.logic, 0) / userScores.length) : 0;
  const avgStructure = userScores.length ? Math.round(userScores.reduce((a: number, s: any) => a + s.structure, 0) / userScores.length) : 0;

  const weakest = [
    { label: 'Clarity', value: avgClarity },
    { label: 'Logic', value: avgLogic },
    { label: 'Structure', value: avgStructure },
  ].sort((a, b) => a.value - b.value)[0];

  const personalizedTips: Record<string, string[]> = {
    Clarity: [
      'Use shorter, punchy sentences — aim for 15–20 words per sentence.',
      'Lead with your claim, then support it. Don\'t bury the point.',
      'Cut filler words: "basically", "kind of", "um", "you know".',
    ],
    Logic: [
      'Back every claim with a specific data point, study, or named example.',
      'Use causal language: "This leads to…", "The evidence shows…", "As a result…"',
      'Avoid overgeneralizations like "always" and "everyone" — they invite attacks.',
    ],
    Structure: [
      'Open with your claim, add evidence, close with impact. Repeat every turn.',
      'Use transitions: "First…", "Furthermore…", "Therefore…" to signal reasoning.',
      'End arguments with a summary sentence that forces the AI to respond.',
    ],
  };

  const tips = personalizedTips[weakest?.label || 'Logic'];

  const difficultyLabel: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    hard: 'Expert',
    hell: 'Hell Mode',
  };

  const handleShare = () => {
    const result = didUserWin ? 'defeated' : 'went head-to-head with';
    const text = `I just ${result} ${persona || 'an AI'} on "${topic}" at ${difficultyLabel[difficulty] || 'Intermediate'} — scoring ${userAvg}/100 on ArgueMaster Pro. Think you can do better?`;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!', description: 'Share your result anywhere.' });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className={`text-center space-y-2 ${didUserWin ? 'animate-celebration' : ''}`}>
          <Trophy className={`w-16 h-16 mx-auto ${feedback.color}`} />
          <h1 className={`text-3xl md:text-4xl font-bold ${feedback.color}`}>
            {feedback.title}
          </h1>
          <p className="text-muted-foreground">{topic}</p>
          {difficulty && (
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {difficultyLabel[difficulty] || difficulty}
            </span>
          )}
        </div>

        {/* Scoreboard */}
        <Card className="p-6 border-2 border-border bg-card/50 backdrop-blur">
          <h2 className="text-xl font-semibold mb-4">Scoreboard</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">You</p>
              <p className={`text-5xl font-bold ${feedback.color}`}>{userAvg}</p>
              <Progress value={userAvg} className="h-2 mt-2" />
            </div>
            {aiAvg !== null ? (
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{persona || 'AI'}</p>
                <p className="text-5xl font-bold text-destructive">{aiAvg}</p>
                <Progress value={aiAvg} className="h-2 mt-2" />
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Result</p>
                <p className={`text-2xl font-bold ${feedback.color}`}>{didUserWin ? 'WIN' : 'LOSS'}</p>
              </div>
            )}
          </div>
          {margin !== null && (
            <p className={`text-center text-sm mt-4 font-medium ${margin > 0 ? 'text-green-500' : 'text-destructive'}`}>
              {margin > 0 ? `You won by ${margin} points` : margin < 0 ? `Lost by ${Math.abs(margin)} points` : 'Dead even'}
            </p>
          )}
          <p className="text-muted-foreground text-sm text-center mt-2">{feedback.message}</p>
        </Card>

        {/* Per-round breakdown */}
        <Card className="p-6 space-y-4 border-2 border-border bg-card/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Your Round-by-Round</h2>
          </div>
          <div className="space-y-4">
            {userScores.map((score: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Round {idx + 1}</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Clarity</p>
                    <p className="text-lg font-semibold">{score.clarity}<span className="text-xs text-muted-foreground">/100</span></p>
                    <Progress value={score.clarity} className="h-1 mt-1" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Logic</p>
                    <p className="text-lg font-semibold">{score.logic}<span className="text-xs text-muted-foreground">/100</span></p>
                    <Progress value={score.logic} className="h-1 mt-1" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Structure</p>
                    <p className="text-lg font-semibold">{score.structure}<span className="text-xs text-muted-foreground">/100</span></p>
                    <Progress value={score.structure} className="h-1 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {userScores.length > 0 && (
            <div className="pt-2 border-t border-border grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Avg Clarity</p>
                <p className="font-bold text-primary">{avgClarity}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Logic</p>
                <p className="font-bold text-primary">{avgLogic}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Structure</p>
                <p className="font-bold text-primary">{avgStructure}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Personalized Tips */}
        <Card className="p-6 space-y-3 border-2 border-border bg-card/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h2 className="text-xl font-semibold">
              Work on Your {weakest?.label || 'Logic'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (your weakest area this debate)
              </span>
            </h2>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary font-bold mt-0.5">→</span>
                {tip}
              </li>
            ))}
          </ul>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => navigate('/topics')}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            New Debate
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Result
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex-none"
          >
            <Home className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
