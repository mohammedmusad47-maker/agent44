import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { restaurants } from '@/data/restaurants';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, getSubtotal } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [residenceType, setResidenceType] = useState('');
  const [city, setCity] = useState('');
  const [block, setBlock] = useState('');
  const [road, setRoad] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  
  // Card payment states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardErrors, setCardErrors] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });
  
  // Get delivery fee from the restaurant
  const restaurantName = items[0]?.restaurant;
  const restaurant = restaurants.find(r => r.name === restaurantName);
  const deliveryFee = restaurant?.deliveryFee || 2.0;
  
  const subtotal = getSubtotal();
  const orderTotal = subtotal + deliveryFee;

  useEffect(() => {
    const loadUserAddress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setResidenceType(profile.residence_type || '');
          setCity(profile.city || '');
          setBlock(profile.block || '');
          setRoad(profile.road || '');
          setHouseNumber(profile.house_number || '');
          setBuildingNumber(profile.building_number || '');
          setFlatNumber(profile.flat_number || '');
        }
      } catch (error) {
        console.error('Error loading user address:', error);
      }
    };

    loadUserAddress();
  }, []);
  
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validate payment method selection
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // Validate card details if card payment is selected
    if (paymentMethod === 'card') {
      let hasErrors = false;
      const errors = { cardNumber: '', expiryDate: '', cvv: '', cardName: '' };

      // Validate card number
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        errors.cardNumber = 'Card number must be 16 digits';
        hasErrors = true;
      }

      // Validate expiry date
      if (!expiryDate || expiryDate.length !== 5) {
        errors.expiryDate = 'Format must be MM/YY';
        hasErrors = true;
      } else {
        const parts = expiryDate.split('/');
        const month = parseInt(parts[0]);
        if (month < 1 || month > 12) {
          errors.expiryDate = 'Invalid month';
          hasErrors = true;
        }
      }

      // Validate CVV
      if (!cvv || cvv.length !== 3) {
        errors.cvv = 'CVV must be 3 digits';
        hasErrors = true;
      }

      // Validate card name
      if (!cardName || cardName.trim().length < 3) {
        errors.cardName = 'Name must be at least 3 characters';
        hasErrors = true;
      }

      if (hasErrors) {
        setCardErrors(errors);
        toast.error('Please fill all card details correctly');
        return;
      }
    }

    setIsProcessing(true);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('Please login to place an order');
        navigate('/login');
        return;
      }

      // Group items by restaurant
      const restaurantName = items[0]?.restaurant || 'Unknown Restaurant';
      const restaurantId = restaurantName.toLowerCase().replace(/\s+/g, '-');
      
      // Get restaurant logo from restaurants data
      const restaurantData = restaurants.find(r => r.name === restaurantName);
      const restaurantImage = restaurantData?.image || '';

      // Build delivery address string
      let addressString = '';
      if (residenceType === 'house') {
        addressString = `House ${houseNumber}, Road ${road}, Block ${block}, ${city}`;
      } else {
        addressString = `Building ${buildingNumber}, Flat ${flatNumber}, Road ${road}, Block ${block}, ${city}`;
      }
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          restaurant_id: restaurantId,
          restaurant_name: restaurantName,
          restaurant_image: restaurantImage,
          total: orderTotal,
          status: 'confirmed',
          delivery_address: addressString + (deliveryNotes ? ` - ${deliveryNotes}` : ''),
          payment_method: paymentMethod
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        restaurant_name: item.restaurant,
        restaurant_image: item.image,
        special_instructions: item.specialInstructions
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart and navigate
      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/tracking/${order.id}`);
      
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-gradient-hero px-4 pt-12 pb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cart')}
            className="text-white hover:bg-white/10 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-white text-2xl font-bold">Checkout</h1>
            <p className="text-white/80">Complete your order</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6 -mt-4">
        {/* Delivery Address */}
        <Card className="shadow-foodgo-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin size={20} className="text-primary" />
              <span>Delivery Address</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input 
                id="city"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="block">Block</Label>
                <Input 
                  id="block" 
                  placeholder="Block" 
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="road">Road</Label>
                <Input 
                  id="road" 
                  placeholder="Road" 
                  value={road}
                  onChange={(e) => setRoad(e.target.value)}
                />
              </div>
            </div>
            
            {residenceType === 'house' ? (
              <div>
                <Label htmlFor="houseNumber">House Number</Label>
                <Input 
                  id="houseNumber"
                  placeholder="House Number"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buildingNumber">Building Number</Label>
                  <Input 
                    id="buildingNumber"
                    placeholder="Building #"
                    value={buildingNumber}
                    onChange={(e) => setBuildingNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="flatNumber">Flat Number</Label>
                  <Input 
                    id="flatNumber"
                    placeholder="Flat #"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="notes">Delivery Notes (Optional)</Label>
              <Textarea 
                id="notes"
                placeholder="Special instructions for the driver..."
                rows={3}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="shadow-foodgo-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard size={20} className="text-primary" />
              <span>Payment Method</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex-1">
                  <div>
                    <p className="font-medium">Credit/Debit Card</p>
                    <p className="text-sm text-muted-foreground">Visa, Mastercard, etc.</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex-1">
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">Pay when order arrives</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="apple" id="apple" />
                <Label htmlFor="apple" className="flex-1">
                  <div>
                    <p className="font-medium">Apple Pay</p>
                    <p className="text-sm text-muted-foreground">Touch ID or Face ID</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {paymentMethod === 'card' && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input 
                    id="cardNumber" 
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 16) {
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                        setCardNumber(formatted);
                        setCardErrors(prev => ({ ...prev, cardNumber: '' }));
                      }
                    }}
                    onBlur={() => {
                      if (cardNumber.replace(/\s/g, '').length !== 16) {
                        setCardErrors(prev => ({ ...prev, cardNumber: 'Card number must be 16 digits' }));
                      }
                    }}
                    className={cardErrors.cardNumber ? 'border-destructive' : ''}
                  />
                  {cardErrors.cardNumber && (
                    <p className="text-sm text-destructive mt-1">{cardErrors.cardNumber}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input 
                      id="expiry" 
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          value = value.slice(0, 2) + '/' + value.slice(2, 4);
                        }
                        if (value.length <= 5) {
                          setExpiryDate(value);
                          setCardErrors(prev => ({ ...prev, expiryDate: '' }));
                        }
                      }}
                      onBlur={() => {
                        const parts = expiryDate.split('/');
                        if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) {
                          setCardErrors(prev => ({ ...prev, expiryDate: 'Format must be MM/YY' }));
                        } else {
                          const month = parseInt(parts[0]);
                          if (month < 1 || month > 12) {
                            setCardErrors(prev => ({ ...prev, expiryDate: 'Invalid month' }));
                          }
                        }
                      }}
                      className={cardErrors.expiryDate ? 'border-destructive' : ''}
                    />
                    {cardErrors.expiryDate && (
                      <p className="text-sm text-destructive mt-1">{cardErrors.expiryDate}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input 
                      id="cvv" 
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 3) {
                          setCvv(value);
                          setCardErrors(prev => ({ ...prev, cvv: '' }));
                        }
                      }}
                      onBlur={() => {
                        if (cvv.length !== 3) {
                          setCardErrors(prev => ({ ...prev, cvv: 'CVV must be 3 digits' }));
                        }
                      }}
                      className={cardErrors.cvv ? 'border-destructive' : ''}
                    />
                    {cardErrors.cvv && (
                      <p className="text-sm text-destructive mt-1">{cardErrors.cvv}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardName">Name on Card</Label>
                  <Input 
                    id="cardName" 
                    placeholder="Your Name"
                    value={cardName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                      setCardName(value);
                      setCardErrors(prev => ({ ...prev, cardName: '' }));
                    }}
                    onBlur={() => {
                      if (cardName.trim().length < 3) {
                        setCardErrors(prev => ({ ...prev, cardName: 'Name must be at least 3 characters' }));
                      }
                    }}
                    className={cardErrors.cardName ? 'border-destructive' : ''}
                  />
                  {cardErrors.cardName && (
                    <p className="text-sm text-destructive mt-1">{cardErrors.cardName}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="shadow-foodgo-md border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
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
                <span className="text-primary">BHD {orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Place Order Button */}
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <Button 
          onClick={handlePlaceOrder}
          disabled={isProcessing}
          className="w-full bg-primary hover:bg-primary/90 text-white py-4 shadow-foodgo-lg"
          size="lg"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing Order...</span>
            </div>
          ) : (
            <>
              <CheckCircle className="mr-2" size={20} />
              Place Order • BHD {orderTotal.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;