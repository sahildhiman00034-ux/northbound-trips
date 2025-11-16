import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { Categories } from "@/components/Categories";
import { TripCard } from "@/components/TripCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";

const Home = () => {
  const { data: trips, isLoading } = useQuery({
    queryKey: ["featured-trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*, categories(name)")
        .eq("is_active", true)
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Hero />
        <div className="my-8">
          <SearchBar />
        </div>
        <Categories />
        <div className="py-12">
          <h2 className="mb-8 text-3xl font-bold">Featured Trips</h2>
          {isLoading ? (
            <div className="text-center">Loading trips...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trips?.map((trip) => (
                <TripCard
                  key={trip.id}
                  id={trip.id}
                  title={trip.title}
                  location={trip.location}
                  price={trip.price_per_person}
                  duration_days={trip.duration_days}
                  duration_nights={trip.duration_nights}
                  max_seats={trip.max_seats}
                  images={trip.images || []}
                  category={trip.categories}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
