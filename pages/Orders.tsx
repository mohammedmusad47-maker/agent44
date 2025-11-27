import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, RotateCcw, ShoppingCart, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  price: number;
  restaurant_name?: string;
  restaurant_image?: string;
  special_instructions?: string;
}

interface Order {
  id: string;
  restaurant_name: string;
  restaurant_image: string;
  total: number;
  status: string;
  created_at: string;
  items?: OrderItem[];
}

const Orders = () => {
  const navigate = useNavigate();
  const { addItem, getCurrentRestaurant, clearCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to real-time order updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Fetch orders with their items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
          
          return { ...order, items: items || [] };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const currentOrders = orders.filter(order => 
    !['delivered', 'cancelled'].includes(order.status)
  );
  
  const pastOrders = orders.filter(order => 
    ['delivered', 'cancelled'].includes(order.status)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-yellow-500';
      case 'out_for_delivery': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return CheckCircle;
      case 'preparing': return Clock;
      case 'out_for_delivery': return RotateCcw;
      case 'delivered': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      toast.error('No items found in this order');
      return;
    }

    // Check if cart has items from a different restaurant
    const currentRestaurant = getCurrentRestaurant();
    const orderRestaurant = order.items[0].restaurant_name || order.restaurant_name;
    
    if (currentRestaurant && currentRestaurant !== orderRestaurant) {
      // Clear cart if items are from a different restaurant
      clearCart();
      toast.info('Cart cleared - items from previous restaurant removed');
    }

    order.items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        addItem({
          id: item.id,
          name: item.item_name,
          price: item.price,
          image: item.restaurant_image || order.restaurant_image || '/placeholder.svg',
          restaurant: item.restaurant_name || order.restaurant_name,
          specialInstructions: item.special_instructions // Add as label only, not saved to DB on new order
        });
      }
    });

    toast.success(`${order.items.length} items added to cart`);
    navigate('/cart');
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const StatusIcon = getStatusIcon(order.status);
    
    return (
      <Card className="shadow-foodgo-sm border-0">
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <img 
              src={order.restaurant_image || '/placeholder.svg'} 
              alt={order.restaurant_name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{order.restaurant_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`${getStatusColor(order.status)} text-white`}
                >
                  <StatusIcon size={12} className="mr-1" />
                  {order.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="mb-3">
                {order.items?.slice(0, 2).map((item) => (
                  <div key={item.id} className="text-sm">
                    <p className="text-muted-foreground">
                      • {item.item_name} x{item.quantity}
                    </p>
                    {item.special_instructions && (
                      <p className="text-xs text-muted-foreground/70 ml-4 italic">
                        Note: {item.special_instructions}
                      </p>
                    )}
                  </div>
                ))}
                {(order.items?.length || 0) > 2 && (
                  <p className="text-sm text-muted-foreground">
                    • +{(order.items?.length || 0) - 2} more items
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <p className="font-bold text-primary">BHD {order.total.toFixed(2)}</p>
                
                <div className="flex space-x-2">
                  {!['delivered', 'cancelled'].includes(order.status) ? (
                    <Button 
                      size="sm" 
                      onClick={() => navigate(`/tracking/${order.id}`)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Track Order
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleReorder(order)}
                    >
                      {order.status === 'delivered' ? 'Reorder' : 'Order Again'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero px-4 pt-12 pb-8">
        <div>
          <h1 className="text-white text-2xl font-bold mb-2">Your Orders</h1>
          <p className="text-white/80">Track current and view past orders</p>
        </div>
      </header>

      <main className="px-4 -mt-4">
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="current" className="flex items-center space-x-2">
              <Clock size={16} />
              <span>Current Orders</span>
              {currentOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary">
                  {currentOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center space-x-2">
              <CheckCircle size={16} />
              <span>Past Orders</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {currentOrders.length > 0 ? (
              currentOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <Card className="shadow-foodgo-sm border-0">
                <CardContent className="p-12 text-center">
                  <ShoppingCart size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No current orders</h3>
                  <p className="text-muted-foreground mb-6">
                    You don't have any orders in progress right now.
                  </p>
                  <Button onClick={() => navigate('/home')} className="bg-primary hover:bg-primary/90">
                    Start Ordering
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastOrders.length > 0 ? (
              pastOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <Card className="shadow-foodgo-sm border-0">
                <CardContent className="p-12 text-center">
                  <CheckCircle size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No past orders</h3>
                  <p className="text-muted-foreground mb-6">
                    Your order history will appear here.
                  </p>
                  <Button onClick={() => navigate('/home')} className="bg-primary hover:bg-primary/90">
                    Place Your First Order
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Orders;