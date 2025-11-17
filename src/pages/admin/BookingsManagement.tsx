import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const BookingsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          profiles (full_name, email),
          trips (title, location),
          trip_schedules (start_date, end_date)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ booking_status: status })
        .eq("id", bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({
        title: "Booking updated",
        description: "Booking status has been successfully updated.",
      });
    },
  });

  const confirmedBookings = bookings?.filter((b) => b.booking_status === "confirmed");
  const pendingBookings = bookings?.filter((b) => b.booking_status === "pending");
  const cancelledBookings = bookings?.filter((b) => b.booking_status === "cancelled");

  const BookingsTable = ({ data }: { data: any[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Trip</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>People</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((booking: any) => (
            <TableRow key={booking.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{booking.profiles?.full_name || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">{booking.profiles?.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{booking.trips?.title}</p>
                  <p className="text-sm text-muted-foreground">{booking.trips?.location}</p>
                </div>
              </TableCell>
              <TableCell>
                {booking.trip_schedules?.start_date &&
                  format(new Date(booking.trip_schedules.start_date), "MMM dd, yyyy")}
              </TableCell>
              <TableCell>{booking.number_of_people}</TableCell>
              <TableCell className="font-semibold">₹{booking.total_amount.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={booking.payment_method === "cod" ? "outline" : "default"}>
                  {booking.payment_method === "cod" ? "COD" : "Online"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    booking.booking_status === "confirmed"
                      ? "default"
                      : booking.booking_status === "cancelled"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {booking.booking_status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  {booking.booking_status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateBookingStatus.mutate({
                          bookingId: booking.id,
                          status: "confirmed",
                        })
                      }
                    >
                      Approve
                    </Button>
                  )}
                  {booking.booking_status === "confirmed" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        updateBookingStatus.mutate({
                          bookingId: booking.id,
                          status: "cancelled",
                        })
                      }
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Bookings Management</h1>
          <p className="text-muted-foreground">Manage all bookings on the platform</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All ({bookings?.length || 0})</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed ({confirmedBookings?.length || 0})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingBookings?.length || 0})</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled ({cancelledBookings?.length || 0})</TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="py-8 text-center">Loading bookings...</div>
              ) : (
                <>
                  <TabsContent value="all">
                    <BookingsTable data={bookings || []} />
                  </TabsContent>
                  <TabsContent value="confirmed">
                    <BookingsTable data={confirmedBookings || []} />
                  </TabsContent>
                  <TabsContent value="pending">
                    <BookingsTable data={pendingBookings || []} />
                  </TabsContent>
                  <TabsContent value="cancelled">
                    <BookingsTable data={cancelledBookings || []} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BookingsManagement;
