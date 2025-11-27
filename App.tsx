import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import Splash from "./pages/Splash";
import Home from "./pages/Home";
import Category from "./pages/Category";
import Restaurant from "./pages/Restaurant";
import Restaurants from "./pages/Restaurants";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyOTP from "./pages/VerifyOTP";
import AddressEntry from "./pages/AddressEntry";
import NotFound from "./pages/NotFound";
import { BottomNavigation } from "./components/BottomNavigation";
import { AIAssistant } from "./components/AIAssistant";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const hideNavigation = ['/', '/login', '/signup', '/verify-otp', '/address-entry'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/address-entry" element={<AddressEntry />} />
        <Route path="/home" element={<Home />} />
        <Route path="/category/:categoryName" element={<Category />} />
        <Route path="/restaurant/:restaurantId" element={<Restaurant />} />
        <Route path="/restaurants" element={<Restaurants />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/tracking/:orderId" element={<OrderTracking />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNavigation && <BottomNavigation />}
      {!hideNavigation && <AIAssistant />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
