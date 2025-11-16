import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Booking = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
      setSession(session);
    });
  }, [navigate]);

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["trip-schedules", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_schedules")
        .select("*")
        .eq("trip_id", tripId)
        .eq("is_active", true)
        .gte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date");

      if (error) throw error;
      return data;
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id || !trip || !selectedScheduleId) {
        throw new Error("Missing required information");
      }

      const totalAmount = trip.price_per_person * numberOfPeople;

      const { data, error } = await supabase
        .from("bookings")
        .insert({
          user_id: session.user.id,
          trip_id: tripId,
          schedule_id: selectedScheduleId,
          number_of_people: numberOfPeople,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "cod" ? "pending" : "confirmed",
          booking_status: "confirmed",
        })
        .select()
        .single();

      if (error) throw error;

      // Update available seats
      const schedule = schedules?.find((s) => s.id === selectedScheduleId);
      if (schedule) {
        await supabase
          .from("trip_schedules")
          .update({ available_seats: schedule.available_seats - numberOfPeople })
          .eq("id", selectedScheduleId);
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Booking Successful!",
        description: "Your trip has been booked successfully.",
      });
      navigate("/payment-success");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message,
      });
    },
  });

  const handleBooking = () => {
    if (!selectedScheduleId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a date",
      });
      return;
    }

    bookingMutation.mutate();
  };

  if (!trip) return null;

  const totalAmount = trip.price_per_person * numberOfPeople;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Book Your Trip</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
              </CardHeader>
              <CardContent>
                <h2 className="mb-2 text-2xl font-bold">{trip.title}</h2>
                <p className="text-muted-foreground">{trip.location}</p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="schedule">Select Date</Label>
                  <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                    <SelectTrigger id="schedule">
                      <SelectValue placeholder="Choose a date" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedules?.map((schedule) => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                          {format(new Date(schedule.start_date), "MMM dd")} -{" "}
                          {format(new Date(schedule.end_date), "MMM dd, yyyy")} ({schedule.available_seats} seats left)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="people">Number of People</Label>
                  <Input
                    id="people"
                    type="number"
                    min="1"
                    max={trip.max_seats}
                    value={numberOfPeople}
                    onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod">Cash on Delivery (Pay at Meeting Point)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online">Online Payment</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Price per person</span>
                  <span>₹{trip.price_per_person.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Number of people</span>
                  <span>{numberOfPeople}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total Amount</span>
                    <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={bookingMutation.isPending || !selectedScheduleId}
                >
                  {bookingMutation.isPending ? "Processing..." : "Confirm Booking"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Booking;
