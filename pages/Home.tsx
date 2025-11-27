import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Clock, Truck, Bot, MessageSquare, Mic, Coffee, Pizza, UtensilsCrossed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { categories, restaurants } from '@/data/restaurants';
import wsallkLogo from '@/assets/wsallk-logo.png';
import { useToast } from '@/hooks/use-toast';
const Home = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [cityName, setCityName] = useState('Your Location');
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.city) {
        setCityName(user.city);
      }
    }
  }, []);
  // Filter restaurants based on search query
  const filteredRestaurants = searchQuery.trim()
    ? restaurants.filter(restaurant => {
        const query = searchQuery.toLowerCase();
        // Search in restaurant name
        if (restaurant.name.toLowerCase().includes(query)) return true;
        // Search in restaurant description
        if (restaurant.description.toLowerCase().includes(query)) return true;
        // Search in menu items
        return restaurant.menu.some(item => 
          item.name.toLowerCase().includes(query) || 
          item.description.toLowerCase().includes(query)
        );
      })
    : [];

  const featuredRestaurants = searchQuery.trim() ? filteredRestaurants : restaurants.slice(0, 4);
  const restaurantsWithOffers = restaurants.filter(restaurant => restaurant.offer?.isActive);
  const showSearchResults = searchQuery.trim().length > 0;
  const handleAIOrder = (mode: 'voice' | 'chat') => {
    setShowAIDialog(false);
    toast({
      title: `AI ${mode} assistant activated`,
      description: `Starting ${mode}-based food discovery assistant...`
    });
    // In a real app, this would initialize the AI food discovery system
  };
  return <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero px-4 pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <img src={wsallkLogo} alt="Wsallk" className="w-10 h-10" />
            <div>
              <h1 className="text-white text-xl font-bold">Wsallk</h1>
              
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Deliver to</p>
            <p className="text-white font-medium">📍 {cityName}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input placeholder="Search restaurants, dishes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-white/95 backdrop-blur-sm border-0 shadow-foodgo-md" />
        </div>
      </header>

      <main className="px-4 space-y-8 -mt-4">
        {/* Search Results */}
        {showSearchResults && (
          <section className="mt-6">
            <h2 className="text-2xl font-bold mb-4">
              Search Results {filteredRestaurants.length > 0 && `(${filteredRestaurants.length})`}
            </h2>
            
            {filteredRestaurants.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-2">No results found</p>
                <p className="text-muted-foreground text-sm">Try searching for something else</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRestaurants.map(restaurant => (
                  <Card 
                    key={restaurant.id} 
                    className="cursor-pointer transition-smooth hover:shadow-foodgo-md border-0 shadow-foodgo-sm" 
                    onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <img src={restaurant.image} alt={restaurant.name} className="w-full h-48 object-cover rounded-t-lg" />
                        {!restaurant.isOpen && (
                          <div className="absolute inset-0 bg-black/50 rounded-t-lg flex items-center justify-center">
                            <Badge variant="secondary" className="bg-red-500 text-white">
                              Closed
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                          <div className="flex items-center space-x-1 text-sm">
                            <Star size={16} className="text-yellow-500 fill-current" />
                            <span className="font-medium">{restaurant.rating}</span>
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-3">{restaurant.description}</p>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock size={14} />
                            <span>{restaurant.deliveryTime}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Truck size={14} />
                            <span>BHD {restaurant.deliveryFee}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Delivery Offers */}
        {!showSearchResults && <section>
          <h2 className="text-2xl font-bold mb-6 mt-6">OFFERS</h2>
          <div className="relative">
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {restaurantsWithOffers.map((restaurant, index) => <Card key={restaurant.id} className="min-w-[300px] h-[240px] flex-shrink-0 shadow-foodgo-md border-0 bg-gradient-primary text-white overflow-hidden snap-start hover-scale transition-smooth cursor-pointer" onClick={() => navigate(`/restaurant/${restaurant.id}`)}>
                  <CardContent className="p-0 relative h-full flex flex-col">
                     <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent z-10" />
                     <img src={restaurant.offer?.image || restaurant.image} alt={restaurant.offer?.title} className="w-full h-28 object-cover flex-shrink-0" />
                     <div className="relative z-20 p-4 bg-gradient-to-t from-black/80 to-transparent -mt-16 pt-16 flex-grow flex flex-col justify-end">
                       <div className="space-y-3">
                         <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs font-medium px-3 py-1 w-fit">
                           {restaurant.offer?.badge}
                         </Badge>
                         <div>
                           <h3 className="text-xl font-bold mb-1">{restaurant.offer?.title}</h3>
                           <p className="text-white/90 text-sm leading-relaxed">{restaurant.offer?.description}</p>
                           <p className="text-white/80 text-xs mt-2">Available at {restaurant.name}</p>
                         </div>
                       </div>
                     </div>
                  </CardContent>
                </Card>)}
            </div>
          </div>
        </section>}

        {/* Categories */}
        {!showSearchResults && <section>
          <h2 className="text-2xl font-bold mb-4">Food Categories</h2>
          <div className="grid grid-cols-3 gap-4">
            {categories.map(category => {
              const IconComponent = category.id === 'breakfast' ? Coffee : 
                                   category.id === 'lunch' ? Pizza : 
                                   UtensilsCrossed;
              
              return (
                <Card key={category.id} className="cursor-pointer transition-smooth hover:shadow-foodgo-md hover:scale-105 border-0 shadow-foodgo-sm" onClick={() => navigate(`/category/${category.id}`)}>
                  <CardContent className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <IconComponent size={40} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>}

        {/* Popular Restaurants */}
        {!showSearchResults && <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Popular Near You</h2>
            <Button variant="ghost" className="text-primary hover:text-primary/80" onClick={() => navigate('/restaurants')}>
              See All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {featuredRestaurants.map(restaurant => <Card key={restaurant.id} className="cursor-pointer transition-smooth hover:shadow-foodgo-md border-0 shadow-foodgo-sm" onClick={() => navigate(`/restaurant/${restaurant.id}`)}>
                <CardContent className="p-0">
                  <div className="relative">
                     <img src={restaurant.image} alt={restaurant.name} className="w-full h-48 object-cover rounded-t-lg" />
                    {!restaurant.isOpen && <div className="absolute inset-0 bg-black/50 rounded-t-lg flex items-center justify-center">
                        <Badge variant="secondary" className="bg-red-500 text-white">
                          Closed
                        </Badge>
                      </div>}
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                      <div className="flex items-center space-x-1 text-sm">
                        <Star size={16} className="text-yellow-500 fill-current" />
                        <span className="font-medium">{restaurant.rating}</span>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-3">{restaurant.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{restaurant.deliveryTime}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Truck size={14} />
                        <span>BHD {restaurant.deliveryFee}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>
        </section>}
      </main>
    </div>;
};
export default Home;