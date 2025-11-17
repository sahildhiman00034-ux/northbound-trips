import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ShoppingBag,
  DollarSign,
  Store,
  Mountain,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();

      if (!data) {
        navigate("/");
        return false;
      }
      return true;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersRes, bookingsRes, tripsRes, vendorsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("bookings").select("id, total_amount", { count: "exact" }),
        supabase.from("trips").select("id", { count: "exact" }),
        supabase.from("user_roles").select("id").eq("role", "vendor"),
      ]);

      const totalRevenue = bookingsRes.data?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

      return {
        totalUsers: usersRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        totalRevenue,
        totalVendors: vendorsRes.data?.length || 0,
        totalTrips: tripsRes.count || 0,
      };
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ["revenue-chart", timeRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("created_at, total_amount")
        .order("created_at", { ascending: true });

      // Group by month for demo
      const monthlyData: Record<string, number> = {};
      data?.forEach((booking) => {
        const month = new Date(booking.created_at!).toLocaleString("default", { month: "short" });
        monthlyData[month] = (monthlyData[month] || 0) + Number(booking.total_amount);
      });

      return Object.entries(monthlyData).map(([month, amount]) => ({
        month,
        revenue: amount,
      }));
    },
  });

  const { data: locationData } = useQuery({
    queryKey: ["location-data"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("trips(location)");

      const locations: Record<string, number> = {};
      data?.forEach((booking: any) => {
        const loc = booking.trips?.location;
        if (loc) locations[loc] = (locations[loc] || 0) + 1;
      });

      return Object.entries(locations)
        .map(([location, count]) => ({ location, bookings: count }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5);
    },
  });

  if (!isAdmin) return null;

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      trend: "+23.08%",
      isPositive: true,
    },
    {
      title: "Total Bookings",
      value: stats?.totalBookings || 0,
      icon: ShoppingBag,
      trend: "+11.43%",
      isPositive: true,
    },
    {
      title: "Total Revenue",
      value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      trend: "+8.48%",
      isPositive: true,
    },
    {
      title: "Total Vendors",
      value: stats?.totalVendors || 0,
      icon: Store,
      trend: "+100%",
      isPositive: true,
    },
    {
      title: "Total Trips",
      value: stats?.totalTrips || 0,
      icon: Mountain,
      trend: "+0%",
      isPositive: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your trip booking platform</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate("/admin/trips")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Manage Trips
            </button>
            <button
              onClick={() => navigate("/admin/bookings")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Manage Bookings
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <Card key={stat.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="rounded-lg bg-primary/10 p-2">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="mt-1 flex items-center text-xs">
                  {stat.isPositive ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.isPositive ? "text-green-500" : "text-red-500"}>
                    {stat.trend}
                  </span>
                  <span className="ml-1 text-muted-foreground">Since last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Overview</CardTitle>
              <Tabs value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <TabsList>
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Revenue (₹)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Location Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
