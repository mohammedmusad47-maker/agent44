import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, User, Lock } from "lucide-react";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check if passwords match
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Normalize email to lowercase for case-insensitive comparison
      const normalizedEmail = email.toLowerCase().trim();

      // Check if email already exists via Edge Function (Auth + Profiles, case-insensitive)
      const { data: emailCheck, error: emailCheckError } = await supabase.functions.invoke("check-email", {
        body: { email: normalizedEmail },
      });

      if (emailCheckError) {
        throw emailCheckError;
      }

      if (emailCheck?.exists) {
        toast({
          title: "This email is already registered!",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            first_name: firstName,
          },
          emailRedirectTo: `${window.location.origin}/home`,
        },
      });

      // Check if error is due to duplicate email
      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          toast({
            title: "This email is already registered!",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        throw error;
      }

      toast({
        title: "Check your email",
        description: "We've sent you a verification code",
      });

      // Navigate to OTP verification page
      navigate("/verify-otp", {
        state: {
          email: normalizedEmail,
          firstName: firstName,
        },
      });
    } catch (error: any) {
      const errorMessage = error.message.includes("already registered")
        ? "This email is already registered!"
        : error.message;

      toast({
        title: "Signup failed",
        description: errorMessage,
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
          <h1 className="text-4xl font-bold text-primary">Sign Up</h1>
          <p className="text-muted-foreground">Create an account to use Wsallk</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
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

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="text-center">
          <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
