import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const email = location.state?.email || "";
  const firstName = location.state?.firstName || "";

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify the OTP
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });

      if (error) throw error;

      // Create profile after successful verification
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            first_name: firstName,
            email: email,
          });

        if (profileError) throw profileError;

        toast({
          title: "Account verified successfully!",
          description: "Please login to continue",
        });
        navigate("/login");
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
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
          <h1 className="text-4xl font-bold text-primary">Verify Email</h1>
          <p className="text-muted-foreground">
            Enter the 6-digit code sent to
          </p>
          <p className="text-foreground font-medium">{email}</p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-8">
          <div className="flex justify-center gap-2">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="h-14 w-12 text-xl border-2 border-primary rounded-lg" />
                <InputOTPSlot index={1} className="h-14 w-12 text-xl border-2 border-primary rounded-lg" />
                <InputOTPSlot index={2} className="h-14 w-12 text-xl border-2 border-primary rounded-lg" />
                <InputOTPSlot index={3} className="h-14 w-12 text-xl border-2 border-primary rounded-lg" />
                <InputOTPSlot index={4} className="h-14 w-12 text-xl border-2 border-primary rounded-lg" />
                <InputOTPSlot index={5} className="h-14 w-12 text-xl border-2 border-primary rounded-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-smooth"
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => navigate("/signup")}
            className="text-primary hover:underline font-medium"
          >
            Back to signup
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
