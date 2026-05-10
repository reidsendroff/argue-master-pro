import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sword, Trophy, Brain, Zap, Target, TrendingUp, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/topics');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Debate Training</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Master the Art of
            <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Persuasive Debate
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Train with AI opponents, get instant feedback on your arguments, and become a debate champion.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-primary to-secondary text-lg px-8 py-6"
            >
              <Sword className="w-5 h-5 mr-2" />
              {user ? 'Continue Training' : 'Start Training'}
            </Button>
            {user && (
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-6"
              >
                <User className="w-5 h-5 mr-2" />
                Profile
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            Why ArgueMaster Pro?
          </h2>
          <p className="text-muted-foreground text-lg">
            The most advanced AI debate training platform
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4 border-2 border-border bg-card/50 backdrop-blur hover:border-primary transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">AI Personas</h3>
            <p className="text-muted-foreground">
              Train against different debate styles - from calm professors to aggressive challengers.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-2 border-border bg-card/50 backdrop-blur hover:border-secondary transition-all">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold">Instant Scoring</h3>
            <p className="text-muted-foreground">
              Get real-time feedback on clarity, logic, structure, and more after every argument.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-2 border-border bg-card/50 backdrop-blur hover:border-accent transition-all">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Track Progress</h3>
            <p className="text-muted-foreground">
              Monitor your improvement over time with detailed analytics and insights.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <Card className="p-12 text-center space-y-6 border-2 border-primary bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur">
          <Trophy className="w-16 h-16 mx-auto text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Elevate Your Debate Skills?
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands of users improving their argumentation every day
          </p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-primary to-secondary text-lg px-8 py-6"
          >
            <Sword className="w-5 h-5 mr-2" />
            {user ? 'Continue Training' : 'Begin Your Journey'}
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Created by Reid Sendroff
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
