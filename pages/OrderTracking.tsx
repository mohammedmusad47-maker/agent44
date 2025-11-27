import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Truck, MapPin, Phone, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type OrderStatus = 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  price: number;
  special_instructions?: string;
}

interface OrderData {
  id: string;
  restaurant_name: string;
  restaurant_image: string;
  total: number;
  status: OrderStatus;
  delivery_address: string;
  created_at: string;
  items?: OrderItem[];
}

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canCancel, setCanCancel] = useState(true);
  const [cancelTimeLeft, setCancelTimeLeft] = useState<number>(20);
  const [progress, setProgress] = useState(25);

  const statusSteps = [
    { status: 'confirmed', label: 'Order Confirmed', icon: CheckCircle, description: 'Your order has been confirmed' },
    { status: 'preparing', label: 'Preparing', icon: Clock, description: 'Restaurant is preparing your food' },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, description: 'Driver is on the way' },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle, description: 'Order delivered successfully' }
  ];

  const cancelledStep = { status: 'cancelled', label: 'Cancelled', icon: XCircle, description: 'Order has been cancelled' };

  useEffect(() => {
    fetchOrder();

    // Subscribe to real-time order updates
    const channel = supabase
      .channel('order-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Manage cancellation window with countdown
  useEffect(() => {
    if (!order || order.status === 'cancelled' || order.status === 'delivered') return;

    const orderCreatedAt = new Date(order.created_at).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const timeSinceCreation = now - orderCreatedAt;
      const timeLeft = Math.max(0, Math.ceil((20000 - timeSinceCreation) / 1000));
      
      setCancelTimeLeft(timeLeft);
      
      if (timeLeft === 0) {
        setCanCancel(false);
      } else {
        setCanCancel(true);
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [order]);

  // Auto-progress order status (starts after 20s cancellation window)
  useEffect(() => {
    if (!order || order.status === 'cancelled' || order.status === 'delivered') return;

    const orderCreatedAt = new Date(order.created_at).getTime();
    const statusProgression: OrderStatus[] = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    const currentIndex = statusProgression.indexOf(order.status);
    
    if (currentIndex >= statusProgression.length - 1) return;

    // Calculate when to move to next status
    // First transition at 20s (after cancellation window), then every 10s after that
    const transitionTime = 20000 + (currentIndex * 10000);
    const now = Date.now();
    const timeSinceCreation = now - orderCreatedAt;
    const timeUntilNextStatus = transitionTime - timeSinceCreation;

    console.log('Setting up status progression:', {
      currentStatus: order.status,
      nextStatus: statusProgression[currentIndex + 1],
      timeUntilNextStatus,
      timeSinceCreation
    });

    if (timeUntilNextStatus > 0) {
      const timer = setTimeout(async () => {
        const nextStatus = statusProgression[currentIndex + 1];
        console.log('Auto-progressing to:', nextStatus);
        
        const { error } = await supabase
          .from('orders')
          .update({ status: nextStatus })
          .eq('id', orderId);

        if (error) {
          console.error('Error updating order status:', error);
        }
      }, timeUntilNextStatus);

      return () => {
        console.log('Clearing timer for status progression');
        clearTimeout(timer);
      };
    } else {
      // If we're past the transition time, update immediately
      const nextStatus = statusProgression[currentIndex + 1];
      console.log('Immediately progressing to:', nextStatus);
      
      supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)
        .then(({ error }) => {
          if (error) console.error('Error updating order status:', error);
        });
    }
  }, [order, orderId]);

  useEffect(() => {
    if (!order) return;
    
    // Update progress based on status
    const progressMap: Record<OrderStatus, number> = {
      confirmed: 25,
      preparing: 50,
      out_for_delivery: 75,
      delivered: 100,
      cancelled: 0
    };
    
    setProgress(progressMap[order.status] || 25);
  }, [order]);

  // Send webhook when order is delivered
  useEffect(() => {
    const sendDeliveryWebhook = async () => {
      if (order?.status === 'delivered' && order.items && order.items.length > 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          let userName = '';
          
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name')
              .eq('id', user.id)
              .single();
            
            userName = profile?.first_name || '';
          }

          // Format order items for webhook
          const orderItemsFormatted = order.items.map(item => {
            const itemText = `${item.quantity} ${item.item_name}`;
            return item.special_instructions 
              ? `${itemText} (${item.special_instructions})` 
              : itemText;
          }).join(', ');

          await supabase.functions.invoke('send-order-to-n8n', {
            body: {
              user_name: userName,
              order_name: orderItemsFormatted
            }
          });
          
          console.log('Delivery webhook sent successfully');
        } catch (error) {
          console.error('Error sending delivery webhook:', error);
        }
      }
    };

    sendDeliveryWebhook();
  }, [order?.status]);

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch order items
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      setOrder({ ...orderData, status: orderData.status as OrderStatus, items: items || [] });
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    if (!canCancel) {
      toast.error('You cannot cancel your order after 20 seconds of placement.');
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      if (error) throw error;

      // Get user name for webhook
      const { data: { user } } = await supabase.auth.getUser();
      let userName = '';
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();
        
        userName = profile?.first_name || '';
      }

      // Send cancellation to webhook
      try {
        await supabase.functions.invoke('send-order-to-n8n', {
          body: {
            user_name: userName,
            order_name: "Your last order has been cancelled"
          }
        });
      } catch (webhookError) {
        console.error('Error sending to webhook:', webhookError);
      }

      toast.success('Order cancelled successfully');
      fetchOrder();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const getStatusIndex = (status: OrderStatus) => {
    return statusSteps.findIndex(step => step.status === status);
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero px-4 pt-12 pb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/orders')}
            className="text-white hover:bg-white/10 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-white text-2xl font-bold">Order Tracking</h1>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="bg-white/20" />
          <p className="text-white/80 text-sm">
            {order.status === 'delivered' ? 'Delivered!' : order.status === 'cancelled' ? 'Cancelled' : 'Estimated 25-35 min'}
          </p>
        </div>
      </header>

      <main className="px-4 space-y-6 -mt-4">
        {/* Current Status */}
        <Card className="shadow-foodgo-md border-0 bg-gradient-card">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">
                {order.status === 'confirmed' && '✅'}
                {order.status === 'preparing' && '👨‍🍳'}
                {order.status === 'out_for_delivery' && '🚗'}
                {order.status === 'delivered' && '🎉'}
                {order.status === 'cancelled' && '❌'}
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {statusSteps[currentStatusIndex]?.label}
              </h2>
              <p className="text-muted-foreground">
                {statusSteps[currentStatusIndex]?.description}
              </p>
              
              {!['delivered', 'cancelled'].includes(order.status) && (
                <div className="mt-4 space-y-2">
                  {canCancel && cancelTimeLeft > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Time left to cancel: <span className="font-bold text-destructive">{cancelTimeLeft}s</span>
                    </p>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={!canCancel}>
                        Cancel Order
                      </Button>
                    </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this order? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, keep order</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelOrder}>
                        Yes, cancel order
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Status Timeline */}
        <Card className="shadow-foodgo-sm border-0">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.status === 'cancelled' ? (
              // Show only cancelled status
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive text-white ring-4 ring-destructive/20">
                  <XCircle size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{cancelledStep.label}</h3>
                  <p className="text-sm text-muted-foreground">{cancelledStep.description}</p>
                </div>
              </div>
            ) : (
              // Show normal order progression
              statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                
                return (
                  <div key={step.status} className="flex items-center space-x-4">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isCompleted 
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                      }
                      ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                    `}>
                      <Icon size={20} />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    
                    {isCompleted && (
                      <CheckCircle size={20} className="text-green-500" />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="shadow-foodgo-sm border-0">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">{order.restaurant_name}</h4>
              <div className="space-y-1">
                {order.items?.map((item) => (
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
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="font-bold text-primary">BHD {order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card className="shadow-foodgo-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin size={20} />
              <span>Delivery Address</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{order.delivery_address}</p>
          </CardContent>
        </Card>


      </main>
    </div>
  );
};

export default OrderTracking;