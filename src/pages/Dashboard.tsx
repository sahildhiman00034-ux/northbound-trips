import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, MapPin, Users } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          trips (
            title,
            location,
            images,
            duration_days,
            duration_nights
          ),
          trip_schedules (
            start_date,
            end_date
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const upcomingBookings = bookings?.filter(
    (booking) =>
      booking.trip_schedules &&
      new Date(booking.trip_schedules.start_date) > new Date() &&
      booking.booking_status === "confirmed"
  );

  const pastBookings = bookings?.filter(
    (booking) =>
      booking.trip_schedules &&
      new Date(booking.trip_schedules.end_date) < new Date()
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">My Dashboard</h1>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Trips</TabsTrigger>
            <TabsTrigger value="past">Past Trips</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{booking.trips.title}</CardTitle>
                        <Badge className="bg-green-500">
                          {booking.booking_status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {booking.trips.location}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(new Date(booking.trip_schedules.start_date), "MMM dd")} -{" "}
                        {format(new Date(booking.trip_schedules.end_date), "MMM dd, yyyy")}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        {booking.number_of_people} {booking.number_of_people === 1 ? "person" : "people"}
                      </div>
                      <div className="pt-2 text-2xl font-bold text-primary">
                        ₹{booking.total_amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Payment: {booking.payment_method === "cod" ? "Cash on Delivery" : "Online"} ({booking.payment_status})
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No upcoming trips. Start exploring!
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastBookings && pastBookings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {pastBookings.map((booking) => (
                  <Card key={booking.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{booking.trips.title}</CardTitle>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {booking.trips.location}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(new Date(booking.trip_schedules.start_date), "MMM dd")} -{" "}
                        {format(new Date(booking.trip_schedules.end_date), "MMM dd, yyyy")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No past trips yet.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
