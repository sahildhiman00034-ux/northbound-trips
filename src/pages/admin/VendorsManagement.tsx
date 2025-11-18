import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VendorApplication {
  id: string;
  user_id: string;
  business_name: string;
  phone: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  document_url: string | null;
  status: string;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

const VendorsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);

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

  const { data: applications = [] } = useQuery({
    queryKey: ["vendor-applications"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!data) return [];

      // Fetch profiles separately
      const userIds = data.map(app => app.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      // Merge the data
      return data.map(app => ({
        ...app,
        profiles: profiles?.find(p => p.id === app.user_id) || { email: "", full_name: "" }
      })) as VendorApplication[];
    },
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("vendor_applications")
        .update({
          status,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-applications"] });
      toast({
        title: "Success",
        description: "Application status updated successfully",
      });
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isAdmin) return null;

  const pendingApplications = applications.filter((app) => app.status === "pending");
  const approvedApplications = applications.filter((app) => app.status === "approved");
  const rejectedApplications = applications.filter((app) => app.status === "rejected");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">Review and manage vendor applications</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications ({pendingApplications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApplications.length === 0 ? (
                  <p className="text-muted-foreground">No pending applications</p>
                ) : (
                  pendingApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between border rounded-lg p-4"
                    >
                      <div>
                        <h3 className="font-semibold">{app.business_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {app.profiles.email} • {app.phone}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {app.city}, {app.state}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedApplication(app)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateApplicationMutation.mutate({ id: app.id, status: "approved" })
                          }
                          disabled={updateApplicationMutation.isPending}
                        >
                          {updateApplicationMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateApplicationMutation.mutate({ id: app.id, status: "rejected" })
                          }
                          disabled={updateApplicationMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approved Vendors ({approvedApplications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvedApplications.length === 0 ? (
                  <p className="text-muted-foreground">No approved vendors yet</p>
                ) : (
                  approvedApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between border rounded-lg p-4"
                    >
                      <div>
                        <h3 className="font-semibold">{app.business_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {app.profiles.email} • {app.phone}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          Approved
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedApplication(app)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rejected Applications ({rejectedApplications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rejectedApplications.length === 0 ? (
                  <p className="text-muted-foreground">No rejected applications</p>
                ) : (
                  rejectedApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between border rounded-lg p-4 opacity-70"
                    >
                      <div>
                        <h3 className="font-semibold">{app.business_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {app.profiles.email} • {app.phone}
                        </p>
                        <Badge variant="destructive" className="mt-2">
                          Rejected
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedApplication(app)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Review vendor application information</DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Business Name</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedApplication.business_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{selectedApplication.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedApplication.profiles.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge>{selectedApplication.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">
                  {selectedApplication.description || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {selectedApplication.address}, {selectedApplication.city},{" "}
                  {selectedApplication.state} - {selectedApplication.pincode}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorsManagement;
