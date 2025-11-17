import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Edit, UserX, UserCheck, Shield, Store, User as UserIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

const UsersManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(`
          *,
          user_roles (role)
        `)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data: profilesData, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      // Get booking counts for each user
      const usersWithActivity = await Promise.all(
        profilesData.map(async (profile) => {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          return {
            ...profile,
            bookingsCount: count || 0,
            roles: profile.user_roles.map((r: any) => r.role),
          };
        })
      );

      return usersWithActivity;
    },
  });

  const updateUserRoles = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      // First, delete existing roles
      await supabase.from("user_roles").delete().eq("user_id", userId);

      // Then insert new roles
      if (roles.length > 0) {
        const roleInserts = roles.map((role) => ({
          user_id: userId,
          role: role as "admin" | "vendor" | "user",
        }));
        const { error } = await supabase.from("user_roles").insert(roleInserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      toast({
        title: "Roles updated",
        description: "User roles have been successfully updated.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user roles.",
      });
    },
  });

  const handleEditRoles = (user: any) => {
    setEditingUser(user);
    setSelectedRoles(user.roles || ["user"]);
  };

  const handleSaveRoles = () => {
    if (editingUser) {
      updateUserRoles.mutate({
        userId: editingUser.id,
        roles: selectedRoles.length > 0 ? selectedRoles : ["user"],
      });
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleBlockUser = (userId: string) => {
    toast({
      title: "Block User",
      description: "User blocking functionality requires database migration. Contact admin.",
    });
  };

  const getRoleBadges = (roles: string[]) => {
    const roleConfig: Record<string, { label: string; icon: any; variant: any }> = {
      admin: { label: "Admin", icon: Shield, variant: "default" },
      vendor: { label: "Vendor", icon: Store, variant: "secondary" },
      user: { label: "User", icon: UserIcon, variant: "outline" },
    };

    return roles.map((role) => {
      const config = roleConfig[role] || roleConfig.user;
      const Icon = config.icon;
      return (
        <Badge key={role} variant={config.variant} className="mr-1">
          <Icon className="mr-1 h-3 w-3" />
          {config.label}
        </Badge>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Users Management</h1>
            <p className="text-muted-foreground">Manage all users and their roles</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {isLoading ? (
              <div className="py-8 text-center">Loading users...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || "N/A"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getRoleBadges(user.roles)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.created_at && format(new Date(user.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.bookingsCount} bookings</Badge>
                        </TableCell>
                        <TableCell>{user.phone || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRoles(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleBlockUser(user.id)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Roles Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Roles</DialogTitle>
            <DialogDescription>
              Manage roles for {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="role-user"
                checked={selectedRoles.includes("user")}
                onCheckedChange={() => toggleRole("user")}
              />
              <label
                htmlFor="role-user"
                className="flex cursor-pointer items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                User (Default)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="role-vendor"
                checked={selectedRoles.includes("vendor")}
                onCheckedChange={() => toggleRole("vendor")}
              />
              <label
                htmlFor="role-vendor"
                className="flex cursor-pointer items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <Store className="mr-2 h-4 w-4" />
                Vendor (Can create trips)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="role-admin"
                checked={selectedRoles.includes("admin")}
                onCheckedChange={() => toggleRole("admin")}
              />
              <label
                htmlFor="role-admin"
                className="flex cursor-pointer items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <Shield className="mr-2 h-4 w-4" />
                Admin (Full access)
              </label>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <p className="font-medium">Selected roles:</p>
              <p className="mt-1">
                {selectedRoles.length > 0 ? selectedRoles.join(", ") : "None (will default to 'user')"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoles} disabled={updateUserRoles.isPending}>
              {updateUserRoles.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
