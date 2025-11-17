import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Wallet,
  History,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDrawer = ({ open, onOpenChange }: ProfileDrawerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);

  // Fetch user profile and role
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session) return null;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      return data;
    },
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["user-role", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      if (!session?.user?.id) return false;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    onOpenChange(false);
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const menuItems = [
    {
      icon: User,
      label: "Profile",
      onClick: () => {
        navigate("/profile");
        onOpenChange(false);
      },
    },
    {
      icon: Wallet,
      label: "Wallet",
      onClick: () => {
        navigate("/wallet");
        onOpenChange(false);
      },
    },
    {
      icon: History,
      label: "Trip History",
      onClick: () => {
        navigate("/dashboard");
        onOpenChange(false);
      },
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: () => {
        navigate("/settings");
        onOpenChange(false);
      },
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Profile Menu</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profile Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.full_name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{profile?.full_name || "User"}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>

          <Separator />

          {/* Admin Control Panel */}
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  navigate("/admin/dashboard");
                  onOpenChange(false);
                }}
                className="flex w-full items-center justify-between rounded-lg bg-primary/10 p-4 transition-colors hover:bg-primary/20"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium text-primary">Control Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-primary" />
              </button>
              <Separator />
            </>
          )}

          {/* Menu Items */}
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex w-full items-center space-x-3 rounded-lg p-3 transition-colors hover:bg-accent"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <Separator />

          {/* Logout Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
