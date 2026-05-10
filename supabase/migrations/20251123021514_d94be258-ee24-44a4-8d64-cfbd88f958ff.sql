-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  username TEXT,
  total_debates INTEGER DEFAULT 0,
  win_rate DECIMAL DEFAULT 0,
  elo INTEGER DEFAULT 1200,
  level TEXT DEFAULT 'Beginner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create debates table
CREATE TABLE public.debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  side TEXT NOT NULL,
  persona TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  total_score DECIMAL DEFAULT 0,
  rounds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own debates"
  ON public.debates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debates"
  ON public.debates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create debate_turns table for each round
CREATE TABLE public.debate_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  user_text TEXT,
  ai_text TEXT,
  score_clarity DECIMAL,
  score_logic DECIMAL,
  score_structure DECIMAL,
  filler_words INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.debate_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view turns for their debates"
  ON public.debate_turns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.debates
      WHERE debates.id = debate_turns.debate_id
      AND debates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert turns for their debates"
  ON public.debate_turns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.debates
      WHERE debates.id = debate_turns.debate_id
      AND debates.user_id = auth.uid()
    )
  );

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();