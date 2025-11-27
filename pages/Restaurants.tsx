import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Clock, Truck, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { restaurants } from '@/data/restaurants';

const Restaurants = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero px-4 pt-12 pb-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 p-2 mr-3"
          >
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="text-white text-xl font-bold">All Restaurants</h1>
            <p className="text-white/80 text-sm">Popular near you</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/95 backdrop-blur-sm border-0 shadow-foodgo-md"
          />
        </div>
      </header>

      <main className="px-4 -mt-4">
        {/* Restaurants Grid */}
        <section>
          <div className="grid grid-cols-1 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <Card 
                key={restaurant.id}
                className="cursor-pointer transition-smooth hover:shadow-foodgo-md border-0 shadow-foodgo-sm"
                onClick={() => navigate(`/restaurant/${restaurant.id}`)}
              >
                <CardContent className="p-0">
                  <div className="relative">
                     <img 
                      src={restaurant.image} 
                      alt={restaurant.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
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
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{restaurant.deliveryTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Truck size={14} />
                          <span>BHD {restaurant.deliveryFee}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Closes {restaurant.closedTime}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRestaurants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No restaurants found matching your search.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Restaurants;