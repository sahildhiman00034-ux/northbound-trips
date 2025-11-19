import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, MapPin, Users, ShieldCheck, Store, User as UserIcon, TrendingUp, DollarSign } from "lucide-react";

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

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ["user-roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
  });

  const isAdmin = userRoles?.includes("admin");
  const isVendor = userRoles?.includes("vendor");
  const isUser = userRoles?.includes("user");

  // Fetch bookings for regular users
  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", userId],
    enabled: !!userId && !isAdmin && !isVendor,
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

  // Fetch trips for vendors
  const { data: vendorTrips } = useQuery({
    queryKey: ["vendor-trips", userId],
    enabled: !!userId && isVendor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          *,
          bookings (count)
        `)
        .eq("vendor_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch admin stats
  const { data: adminStats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!userId && isAdmin,
    queryFn: async () => {
      const [usersCount, tripsCount, bookingsCount, vendorAppsCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("trips").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("vendor_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      return {
        totalUsers: usersCount.count || 0,
        totalTrips: tripsCount.count || 0,
        totalBookings: bookingsCount.count || 0,
        pendingVendorApps: vendorAppsCount.count || 0,
      };
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

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{adminStats?.totalUsers || 0}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Trips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{adminStats?.totalTrips || 0}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{adminStats?.totalBookings || 0}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Vendor Apps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{adminStats?.pendingVendorApps || 0}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/admin/users">
                  <Button variant="outline" className="w-full justify-start">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                </Link>
                <Link to="/admin/trips">
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="mr-2 h-4 w-4" />
                    Manage Trips
                  </Button>
                </Link>
                <Link to="/admin/bookings">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    Manage Bookings
                  </Button>
                </Link>
                <Link to="/admin/vendors">
                  <Button variant="outline" className="w-full justify-start">
                    <Store className="mr-2 h-4 w-4" />
                    Manage Vendors
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Welcome to the admin dashboard. You have full access to manage users, trips, bookings, and vendor applications.
                </p>
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm font-medium">
                    {adminStats?.pendingVendorApps ? 
                      `You have ${adminStats.pendingVendorApps} pending vendor application${adminStats.pendingVendorApps > 1 ? 's' : ''} to review.` : 
                      'All vendor applications have been reviewed.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Vendor Dashboard
  if (isVendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Vendor Dashboard</h1>
            </div>
            <Link to="/vendor/dashboard">
              <Button>
                <MapPin className="mr-2 h-4 w-4" />
                Create New Trip
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>My Trips</CardTitle>
              </CardHeader>
              <CardContent>
                {vendorTrips && vendorTrips.length > 0 ? (
                  <div className="space-y-4">
                    {vendorTrips.map((trip) => (
                      <Link key={trip.id} to={`/trips/${trip.id}`}>
                        <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{trip.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {trip.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {trip.max_seats} seats
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ₹{trip.price_per_person}
                              </span>
                            </div>
                          </div>
                          <Badge variant={trip.is_active ? "default" : "secondary"}>
                            {trip.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-4 text-lg text-muted-foreground">
                      You haven't created any trips yet
                    </p>
                    <Link to="/vendor/dashboard">
                      <Button>Create Your First Trip</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Regular User Dashboard
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <UserIcon className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">My Dashboard</h1>
        </div>

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
                        ₹{booking.total_amount}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 text-lg text-muted-foreground">
                    No upcoming trips booked
                  </p>
                  <Link to="/trips">
                    <Button>Browse Available Trips</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastBookings && pastBookings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {pastBookings.map((booking) => (
                  <Card key={booking.id}>
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
                      <div className="flex items-center text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        {booking.number_of_people} {booking.number_of_people === 1 ? "person" : "people"}
                      </div>
                      <div className="pt-2 text-2xl font-bold text-muted-foreground">
                        ₹{booking.total_amount}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    No past trips yet
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
