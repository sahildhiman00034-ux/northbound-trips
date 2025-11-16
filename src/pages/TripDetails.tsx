import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, Check, X } from "lucide-react";
import { format } from "date-fns";

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*, categories(name)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["trip-schedules", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_schedules")
        .select("*")
        .eq("trip_id", id)
        .eq("is_active", true)
        .gte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">Trip not found</div>
      </div>
    );
  }

  const itinerary = trip.itinerary as Record<string, string> || {};

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <img
            src={trip.images?.[0] || "/placeholder.svg"}
            alt={trip.title}
            className="h-96 w-full rounded-2xl object-cover"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-4xl font-bold">{trip.title}</h1>
              {trip.categories && (
                <Badge className="text-lg">{trip.categories.name}</Badge>
              )}
            </div>

            <div className="mb-6 flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                {trip.location}
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                {trip.duration_nights}N / {trip.duration_days}D
              </div>
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Max {trip.max_seats} Guests
              </div>
            </div>

            <p className="mb-8 text-lg">{trip.description}</p>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Itinerary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(itinerary).map(([day, description]) => (
                  <div key={day}>
                    <h3 className="mb-1 font-semibold capitalize">
                      {day.replace("day", "Day ")}
                    </h3>
                    <p className="text-muted-foreground">{description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <Check className="mr-2" /> Inclusions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {trip.inclusions?.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="mr-2 mt-0.5 h-4 w-4 text-green-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <X className="mr-2" /> Exclusions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {trip.exclusions?.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <X className="mr-2 mt-0.5 h-4 w-4 text-red-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Book This Trip</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    ₹{trip.price_per_person.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Per person</div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Meeting Point</h3>
                  <p className="text-sm text-muted-foreground">{trip.meeting_point}</p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Available Dates</h3>
                  {schedules && schedules.length > 0 ? (
                    <div className="space-y-2">
                      {schedules.slice(0, 3).map((schedule) => (
                        <div
                          key={schedule.id}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="font-medium">
                            {format(new Date(schedule.start_date), "MMM dd")} -{" "}
                            {format(new Date(schedule.end_date), "MMM dd, yyyy")}
                          </div>
                          <div className="text-muted-foreground">
                            {schedule.available_seats} seats left
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No schedules available
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate(`/booking/${trip.id}`)}
                  disabled={!schedules || schedules.length === 0}
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TripDetails;
