import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import wsallkLogo from '@/assets/wsallk-logo.png';

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const timer = setTimeout(() => {
        if (session) {
          navigate('/home');
        } else {
          navigate('/signup');
        }
      }, 2500);

      return () => clearTimeout(timer);
    };

    checkAuthAndNavigate();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-32 right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        <div className="animate-pulse-glow">
          <img 
            src={wsallkLogo} 
            alt="Wsallk" 
            className="w-32 h-32 drop-shadow-2xl"
          />
        </div>
        
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Wsallk
          </h1>
          <p className="text-white/80 text-lg font-medium">
            AI-Powered Food Delivery
          </p>
        </div>
        
        {/* Loading indicator */}
        <div className="flex space-x-1 mt-8">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
};

export default Splash;