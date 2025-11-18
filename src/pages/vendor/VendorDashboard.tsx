import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Package, TrendingUp } from "lucide-react";

const VendorDashboard = () => {
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

  const { data: isVendor } = useQuery({
    queryKey: ["is-vendor", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "vendor")
        .maybeSingle();

      if (!data) {
        navigate("/");
        return false;
      }
      return true;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["vendor-stats", userId],
    enabled: !!userId && isVendor === true,
    queryFn: async () => {
      const [tripsRes, bookingsRes] = await Promise.all([
        supabase.from("trips").select("id", { count: "exact" }).eq("vendor_id", userId!),
        supabase
          .from("bookings")
          .select("total_amount, trips!inner(vendor_id)", { count: "exact" })
          .eq("trips.vendor_id", userId!),
      ]);

      const totalRevenue = bookingsRes.data?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

      return {
        totalTrips: tripsRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        totalRevenue,
      };
    },
  });

  if (!isVendor) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Vendor Dashboard</h1>
          <p className="text-muted-foreground">Manage your trips and bookings</p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Trips
              </CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTrips || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bookings
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => navigate("/vendor/trips/create")}>
            Create New Trip
          </Button>
          <Button variant="outline" onClick={() => navigate("/vendor/trips")}>
            Manage Trips
          </Button>
          <Button variant="outline" onClick={() => navigate("/vendor/bookings")}>
            View Bookings
          </Button>
        </div>
      </main>
    </div>
  );
};

export default VendorDashboard;
