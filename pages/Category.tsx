import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { categories } from '@/data/restaurants';

const Category = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  
  const category = categories.find(c => c.id === categoryName);
  
  if (!category) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Category not found</h1>
          <Button onClick={() => navigate('/home')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero px-4 pt-12 pb-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/home')}
            className="text-white hover:bg-white/10 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{category.icon}</div>
            <div>
              <h1 className="text-white text-2xl font-bold">{category.name}</h1>
              <p className="text-white/80">{category.restaurants.length} restaurants available</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-4 -mt-4">
        {/* Category Banner */}
        <Card className="bg-gradient-card shadow-foodgo-md border-0">
          <CardContent className="p-0">
            <img 
              src={category.image} 
              alt={category.name}
              className="w-full h-32 object-cover rounded-t-lg"
            />
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">Best {category.name} in Town</h2>
              <p className="text-muted-foreground">Discover amazing {category.name.toLowerCase()} from top-rated restaurants</p>
            </div>
          </CardContent>
        </Card>

        {/* Restaurants List */}
        <section className="space-y-4">
          {category.restaurants.map((restaurant) => (
            <Card 
              key={restaurant.id}
              className="cursor-pointer transition-smooth hover:shadow-foodgo-md border-0 shadow-foodgo-sm"
              onClick={() => navigate(`/restaurant/${restaurant.id}`)}
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <img 
                      src={restaurant.image} 
                      alt={restaurant.name}
                      className="w-full h-full object-contain rounded-l-lg p-2"
                    />
                    {!restaurant.isOpen && (
                      <div className="absolute inset-0 bg-black/50 rounded-l-lg flex items-center justify-center">
                        <Badge variant="secondary" className="bg-red-500 text-white text-xs">
                          Closed
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                      <div className="flex items-center space-x-1 text-sm">
                        <Star size={14} className="text-yellow-500 fill-current" />
                        <span className="font-medium">{restaurant.rating}</span>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{restaurant.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{restaurant.deliveryTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Truck size={12} />
                          <span>BHD {restaurant.deliveryFee}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Closes {restaurant.closedTime}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {category.restaurants.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold mb-2">No restaurants available</h3>
            <p className="text-muted-foreground mb-4">Check back later for new {category.name.toLowerCase()} options!</p>
            <Button onClick={() => navigate('/home')}>
              Explore Other Categories
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Category;