import { Navbar } from "@/components/Navbar";
import { TripCard } from "@/components/TripCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const Trips = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const locationParam = searchParams.get("location");

  const [searchLocation, setSearchLocation] = useState(locationParam || "");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || "all");

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips", selectedCategory, searchLocation],
    queryFn: async () => {
      let query = supabase
        .from("trips")
        .select("*, categories(name)")
        .eq("is_active", true);

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      if (searchLocation) {
        query = query.ilike("location", `%${searchLocation}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Explore Trips</h1>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Search by location..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center">Loading trips...</div>
        ) : trips && trips.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
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
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No trips found. Try adjusting your filters.
          </div>
        )}
      </main>
    </div>
  );
};

export default Trips;
