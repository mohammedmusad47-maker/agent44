import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, Truck, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { restaurants } from '@/data/restaurants';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';

const Restaurant = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: cartItems, addItem, getTotalItems, updateQuantity, getCurrentRestaurant, clearCart } = useCart();
  const [showRestaurantDialog, setShowRestaurantDialog] = useState(false);
  const [pendingItem, setPendingItem] = useState<any>(null);
  
  
  const restaurant = restaurants.find(r => r.id === restaurantId);
  
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Restaurant not found</h1>
          <Button onClick={() => navigate('/home')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const addToCart = (itemId: string) => {
    const item = restaurant?.menu.find(menuItem => menuItem.id === itemId);
    if (item) {
      const currentRestaurant = getCurrentRestaurant();
      
      // Check if cart has items from a different restaurant
      if (currentRestaurant && currentRestaurant !== restaurant.name) {
        setPendingItem({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          restaurant: restaurant.name,
        });
        setShowRestaurantDialog(true);
        return;
      }
      
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        restaurant: restaurant.name,
      });
      toast({
        title: "Added to cart",
        description: "Item successfully added to your cart",
      });
    }
  };

  const handleClearAndAdd = () => {
    clearCart();
    if (pendingItem) {
      addItem(pendingItem);
      toast({
        title: "Added to cart",
        description: "Item successfully added to your cart",
      });
    }
    setShowRestaurantDialog(false);
    setPendingItem(null);
  };

  const getItemQuantity = (itemId: string) => {
    const item = cartItems.find(cartItem => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };


  return (
    <>
      <Dialog open={showRestaurantDialog} onOpenChange={setShowRestaurantDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Start a new cart?</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              A new order will clear your cart with "{getCurrentRestaurant()}"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-3 pt-4">
            <Button
              onClick={() => setShowRestaurantDialog(false)}
              variant="outline"
              className="w-full h-12 rounded-full text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearAndAdd}
              className="w-full h-12 rounded-full text-base"
            >
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
      <div className="relative">
        <img 
          src={restaurant.image} 
          alt={restaurant.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-white hover:bg-white/10 p-2"
        >
          <ArrowLeft size={20} />
        </Button>
        
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <div className="flex items-center space-x-1">
              <Star size={16} className="text-yellow-500 fill-current" />
              <span className="font-medium">{restaurant.rating}</span>
            </div>
          </div>
          
          <p className="text-white/90 mb-3">{restaurant.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span>{restaurant.deliveryTime}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Truck size={14} />
                <span>BHD {restaurant.deliveryFee}</span>
              </div>
              <div className="text-xs text-white/80">
                Closes {restaurant.closedTime}
              </div>
            </div>
            
            <Badge 
              variant={restaurant.isOpen ? "secondary" : "destructive"}
              className={restaurant.isOpen ? "bg-green-500 text-white" : ""}
            >
              {restaurant.isOpen ? "Open" : "Closed"}
            </Badge>
          </div>
        </div>
      </div>

      <main className="px-4 space-y-6 mt-6">

        {/* Menu Items */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Menu</h2>
          <div className="space-y-4">
            {restaurant.menu.map((item) => (
              <Card key={item.id} className="shadow-foodgo-sm border-0">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="flex-1 p-4">
                      <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-primary">BHD {item.price.toFixed(2)}</span>
                        <div className="flex items-center space-x-2">
                          {getItemQuantity(item.id) > 0 ? (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-8 h-8 p-0"
                              >
                                <Minus size={14} />
                              </Button>
                              <span className="w-8 text-center font-medium">{getItemQuantity(item.id)}</span>
                              <Button
                                size="sm"
                                onClick={() => addToCart(item.id)}
                                className="w-8 h-8 p-0"
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(item.id)}
                              className="flex items-center space-x-1"
                            >
                              <Plus size={14} />
                              <span>Add</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-40 h-40 flex-shrink-0 overflow-hidden rounded-r-lg">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>


      {/* Floating Cart Button */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40">
          <Button 
            onClick={() => navigate('/cart')}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 shadow-foodgo-lg"
          >
            <div className="flex items-center justify-between w-full">
              <span>Go to Cart</span>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {getTotalItems()} items
              </Badge>
            </div>
          </Button>
        </div>
      )}
      </div>
    </>
  );
};

export default Restaurant;