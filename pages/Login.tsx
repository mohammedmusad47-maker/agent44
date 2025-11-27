import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, authenticate with Supabase using email and password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (authError) {
        throw new Error("Invalid email or password");
      }

      // Then validate first_name matches the profile
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-login', {
        body: {
          first_name: firstName.trim(),
          email: email.toLowerCase().trim(),
        },
      });

      if (validationError || !validationResult?.valid) {
        // Sign out if first name doesn't match
        await supabase.auth.signOut();
        throw new Error("Invalid first name");
      }

      // Send to webhook if credentials are correct
      try {
        await supabase.functions.invoke('send-to-n8n', {
          body: {
            first_name: firstName.trim(),
            email: email.toLowerCase().trim(),
          },
        });
      } catch (webhookError) {
        console.error("Webhook error:", webhookError);
      }

      // Store user session in localStorage including profile data
      const profile = validationResult.profile;
      localStorage.setItem('user', JSON.stringify(profile));

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Check if user has completed address entry
      if (profile.address_completed) {
        navigate("/home");
      } else {
        navigate("/address-entry");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Login</h1>
          <p className="text-muted-foreground">Welcome back to Wsallk</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="pl-10 h-14 bg-card border-border text-base"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 h-14 bg-card border-border text-base"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 h-14 bg-card border-border text-base"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-smooth"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => navigate("/signup")}
            className="text-primary hover:underline font-medium"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
