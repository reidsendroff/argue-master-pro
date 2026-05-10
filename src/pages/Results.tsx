import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, TrendingUp, AlertCircle, Sparkles, Home } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalScore, topic, messages } = location.state || {};

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

  const performance = totalScore >= 80 ? 'excellent' : totalScore >= 60 ? 'good' : 'needs-improvement';
  const performanceMessages = {
    excellent: {
      title: '🏆 Outstanding Performance!',
      message: 'You demonstrated strong argumentation skills with clear logic and structure.',
      color: 'text-debate-win'
    },
    good: {
      title: '👏 Good Effort!',
      message: 'You made solid arguments. With more practice, you\'ll reach excellence.',
      color: 'text-primary'
    },
    'needs-improvement': {
      title: '💪 Keep Practicing!',
      message: 'Every debate makes you stronger. Focus on structure and evidence.',
      color: 'text-debate-neutral'
    }
  };

  const feedback = performanceMessages[performance];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Trophy className={`w-16 h-16 mx-auto ${feedback.color}`} />
          <h1 className={`text-3xl md:text-4xl font-bold ${feedback.color}`}>
            {feedback.title}
          </h1>
          <p className="text-muted-foreground">{topic}</p>
        </div>

        {/* Overall Score */}
        <Card className="p-6 space-y-4 border-2 border-border bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Overall Score</h2>
            <span className={`text-4xl font-bold ${feedback.color}`}>
              {Math.round(totalScore)}/100
            </span>
          </div>
          <Progress value={totalScore} className="h-3" />
          <p className="text-muted-foreground">{feedback.message}</p>
        </Card>

        {/* Performance Breakdown */}
        <Card className="p-6 space-y-4 border-2 border-border bg-card/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Performance Breakdown</h2>
          </div>
          <div className="space-y-4">
            {messages?.filter((m: any) => m.score).map((message: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <p className="text-sm font-medium">Round {idx + 1}</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Clarity</p>
                    <p className="text-lg font-semibold">{message.score.clarity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Logic</p>
                    <p className="text-lg font-semibold">{message.score.logic}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Structure</p>
                    <p className="text-lg font-semibold">{message.score.structure}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Improvement Tips */}
        <Card className="p-6 space-y-4 border-2 border-border bg-card/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h2 className="text-xl font-semibold">Tips for Improvement</h2>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Use evidence and data to support your arguments</li>
            <li>• Structure your arguments with clear transitions (First, Second, Finally)</li>
            <li>• Minimize filler words like "um", "uh", "like"</li>
            <li>• Address counterarguments directly</li>
            <li>• Practice active listening and adapt your strategy</li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            onClick={() => navigate('/topics')}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            New Debate
          </Button>
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="flex-1"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
