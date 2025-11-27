import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { restaurants } from '@/data/restaurants';

const Cart = () => {
  const navigate = useNavigate();
  const { items: cartItems, updateQuantity, removeItem, getSubtotal } = useCart();

  const subtotal = getSubtotal();
  
  // Get delivery fee from the restaurant
  const restaurantName = cartItems[0]?.restaurant;
  const restaurant = restaurants.find(r => r.name === restaurantName);
  const deliveryFee = restaurant?.deliveryFee || 2.0;
  
  const total = subtotal + deliveryFee;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-hero px-4 pt-12 pb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/home')}
              className="text-white hover:bg-white/10 p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-white text-2xl font-bold">Your Cart</h1>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center px-4 py-16">
          <ShoppingCart size={64} className="text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground text-center mb-6">
            Add some delicious items from our restaurants to get started!
          </p>
          <Button onClick={() => navigate('/home')} className="bg-primary hover:bg-primary/90">
            Start Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-gradient-hero px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10 p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-white text-2xl font-bold">Your Cart</h1>
              <p className="text-white/80">{cartItems.length} items</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-4 -mt-4">
        {/* Cart Items */}
        <div className="space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id} className="shadow-foodgo-sm border-0">
              <CardContent className="p-4">
                <div className="flex space-x-4">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        {item.specialInstructions && (
                          <p className="text-sm font-bold text-red-500 mt-1">
                            {item.specialInstructions}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">{item.restaurant}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">BHD {(item.price * item.quantity).toFixed(2)}</span>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-8 h-8 p-0"
                        >
                          <Minus size={14} />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-8 h-8 p-0"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <Card className="shadow-foodgo-md border-0 bg-gradient-card">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>BHD {subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>BHD {deliveryFee.toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">BHD {total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Checkout Button */}
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <Button 
          onClick={() => navigate('/checkout')}
          className="w-full bg-primary hover:bg-primary/90 text-white py-4 shadow-foodgo-lg"
          size="lg"
        >
          Proceed to Checkout • BHD {total.toFixed(2)}
        </Button>
      </div>
    </div>
  );
};

export default Cart;