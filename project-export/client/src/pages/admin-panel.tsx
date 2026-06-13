import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Key, UserPlus, Search, GraduationCap, UserCog, Handshake, Home, Rocket, Mic, Construction, Building2, Clock, Check, X, Users, Snowflake, ShieldOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isHeadAdmin: boolean;
  isFrozen: boolean;
  frozenBy: string | null;
  frozenAt: string | null;
  frozenReason: string | null;
  isPartner: boolean;
  isResident: boolean;
  isFounder: boolean;
  isSpeaker: boolean;
  createdAt: string | null;
};

export default function AdminPanel() {
  const { toast } = useToast();
  const [changePasswordUserId, setChangePasswordUserId] = useState<string | null>(null);
  const [changeRoleUserId, setChangeRoleUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [freezeUserId, setFreezeUserId] = useState<string | null>(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const { data: maintenanceStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/maintenance/status"],
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("/api/maintenance/toggle", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/status"] });
      toast({
        title: maintenanceStatus?.enabled ? "Maintenance Mode Disabled" : "Maintenance Mode Enabled",
        description: maintenanceStatus?.enabled
          ? "The platform is now accessible to all users."
          : "The platform is now locked. Only you can access it.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle maintenance mode",
        variant: "destructive",
      });
    },
  });

  const { data: pendingCompanies = [] } = useQuery<any[]>({
    queryKey: ["/api/companies/pending"],
  });
  const { data: pendingUniversities = [] } = useQuery<any[]>({
    queryKey: ["/api/universities/pending"],
  });
  const { data: pendingClubs = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs/pending"],
  });

  const reviewCompanyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/companies/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Success", description: "Company reviewed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to review company", variant: "destructive" });
    },
  });

  const reviewUniversityMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/universities/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      toast({ title: "Success", description: "University reviewed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to review university", variant: "destructive" });
    },
  });

  const reviewClubMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/clubs/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      toast({ title: "Success", description: "Club reviewed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to review club", variant: "destructive" });
    },
  });

  const totalPending = pendingCompanies.length + pendingUniversities.length + pendingClubs.length;

  // Fetch all users
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/password`, {
        method: "PUT",
        body: JSON.stringify({ newPassword: password }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setChangePasswordUserId(null);
      setNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (adminData: typeof newAdmin) => {
      return await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(adminData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewAdmin({ email: "", password: "", firstName: "", lastName: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin",
        variant: "destructive",
      });
    },
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      setChangeRoleUserId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const toggleAdditionalRoleMutation = useMutation({
    mutationFn: async ({ userId, field, value }: { userId: string; field: string; value: boolean }) => {
      return await apiRequest(`/api/admin/users/${userId}/additional-roles`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const freezeUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/freeze`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setFreezeUserId(null);
      setFreezeReason("");
      toast({ title: "Account Frozen", description: "User account has been frozen." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to freeze account", variant: "destructive" });
    },
  });

  const unfreezeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/unfreeze`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Account Unfrozen", description: "User account has been unfrozen." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to unfreeze account", variant: "destructive" });
    },
  });

  const handleChangePassword = (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ userId, password: newPassword });
  };

  const handleCreateAdmin = () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.firstName || !newAdmin.lastName) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    if (newAdmin.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    createAdminMutation.mutate(newAdmin);
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase().trim();
    return users.filter(user => {
      const firstName = user.firstName?.toLowerCase() || '';
      const lastName = user.lastName?.toLowerCase() || '';
      const email = user.email.toLowerCase();
      
      return firstName.includes(query) || 
             lastName.includes(query) || 
             email.includes(query);
    });
  }, [users, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full">
          <h1 className="text-3xl font-bold mb-6">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-3 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full">
          <Card className="bg-destructive/10 border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="w-6 h-6" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You do not have permission to access the Admin Panel. Only Head Administrators can view this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you believe you should have access, please contact the system administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6 md:p-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
              Head Admin Panel
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage all users and administrators
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Card className={maintenanceStatus?.enabled ? "border-destructive/50 bg-destructive/5" : ""}>
              <CardContent className="flex items-center gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-4">
                <Construction className={`h-5 w-5 shrink-0 ${maintenanceStatus?.enabled ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                  {maintenanceStatus?.enabled ? "Maintenance ON" : "Maintenance OFF"}
                </div>
                <Switch
                  checked={maintenanceStatus?.enabled ?? false}
                  onCheckedChange={(checked) => toggleMaintenanceMutation.mutate(checked)}
                  disabled={toggleMaintenanceMutation.isPending}
                  data-testid="switch-maintenance-mode"
                />
              </CardContent>
            </Card>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-admin" className="gap-2" size="sm">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Admin</span>
                  <span className="sm:hidden">Admin</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-background/95 backdrop-blur-xl border border-white/10">
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
                <DialogDescription>
                  Add a new administrator to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    data-testid="input-admin-email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    data-testid="input-admin-password"
                  />
                </div>
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={newAdmin.firstName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                    data-testid="input-admin-firstname"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={newAdmin.lastName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                    data-testid="input-admin-lastname"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateAdmin}
                  disabled={createAdminMutation.isPending}
                  data-testid="button-submit-create-admin"
                >
                  {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {totalPending > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Approvals
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                  {totalPending}
                </Badge>
              </CardTitle>
              <CardDescription>Review and approve or reject new entity creation requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingCompanies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Corporations ({pendingCompanies.length})
                  </h4>
                  {pendingCompanies.map((company: any) => (
                    <div key={company.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-md border border-border" data-testid={`pending-company-${company.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 rounded-md shrink-0">
                          {company.logo ? <AvatarImage src={company.logo} alt={company.name} /> : null}
                          <AvatarFallback className="rounded-md"><Building2 className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{company.name}</p>
                          {company.creator && (
                            <p className="text-xs text-muted-foreground truncate">
                              by {company.creator.firstName} {company.creator.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => reviewCompanyMutation.mutate({ id: company.id, status: 'active' })}
                          disabled={reviewCompanyMutation.isPending}
                          data-testid={`button-approve-company-${company.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => reviewCompanyMutation.mutate({ id: company.id, status: 'rejected' })}
                          disabled={reviewCompanyMutation.isPending}
                          data-testid={`button-reject-company-${company.id}`}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pendingUniversities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" /> Universities ({pendingUniversities.length})
                  </h4>
                  {pendingUniversities.map((uni: any) => (
                    <div key={uni.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-md border border-border" data-testid={`pending-university-${uni.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 rounded-md shrink-0">
                          {uni.logoUrl ? <AvatarImage src={uni.logoUrl} alt={uni.name} /> : null}
                          <AvatarFallback className="rounded-md"><GraduationCap className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{uni.name}</p>
                          {uni.creator && (
                            <p className="text-xs text-muted-foreground truncate">
                              by {uni.creator.firstName} {uni.creator.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => reviewUniversityMutation.mutate({ id: uni.id, status: 'active' })}
                          disabled={reviewUniversityMutation.isPending}
                          data-testid={`button-approve-university-${uni.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => reviewUniversityMutation.mutate({ id: uni.id, status: 'rejected' })}
                          disabled={reviewUniversityMutation.isPending}
                          data-testid={`button-reject-university-${uni.id}`}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pendingClubs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> Clubs ({pendingClubs.length})
                  </h4>
                  {pendingClubs.map((club: any) => (
                    <div key={club.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-md border border-border" data-testid={`pending-club-${club.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 rounded-md shrink-0">
                          {club.logoUrl ? <AvatarImage src={club.logoUrl} alt={club.name} /> : null}
                          <AvatarFallback className="rounded-md"><Users className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{club.name}</p>
                          {club.creator && (
                            <p className="text-xs text-muted-foreground truncate">
                              by {club.creator.firstName} {club.creator.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => reviewClubMutation.mutate({ id: club.id, status: 'active' })}
                          disabled={reviewClubMutation.isPending}
                          data-testid={`button-approve-club-${club.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => reviewClubMutation.mutate({ id: club.id, status: 'rejected' })}
                          disabled={reviewClubMutation.isPending}
                          data-testid={`button-reject-club-${club.id}`}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Search Field */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users by name, surname, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {filteredUsers.length === 0 && !searchQuery && (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">No users found</p>
              </CardContent>
            </Card>
          )}

          {filteredUsers.length === 0 && searchQuery && (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">No users match your search query</p>
              </CardContent>
            </Card>
          )}
          
          {filteredUsers.map((user) => (
            <Card key={user.id} data-testid={`card-user-${user.id}`}>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
                      {user.firstName} {user.lastName}
                      {user.isHeadAdmin && (
                        <Badge variant="default" className="bg-primary/20 text-primary border-primary/30" data-testid={`badge-head-admin-${user.id}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          Head Admin
                        </Badge>
                      )}
                      {user.isFrozen && (
                        <Badge variant="destructive" data-testid={`badge-frozen-${user.id}`}>
                          <Snowflake className="w-3 h-3 mr-1" />
                          Frozen
                        </Badge>
                      )}
                      
                      {user.role === "lmsAdmin" && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30" data-testid={`badge-lms-admin-${user.id}`}>LMS Admin</Badge>
                      )}
                      {user.role === "eventAdmin" && (
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 border-orange-500/30" data-testid={`badge-event-admin-${user.id}`}>Event Admin</Badge>
                      )}
                      {user.role === "innoLabsAdmin" && (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 border-purple-500/30" data-testid={`badge-innolabs-admin-${user.id}`}>InnoLabs Admin</Badge>
                      )}
                      {user.role === "teacher" && (
                        <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30" data-testid={`badge-teacher-${user.id}`}>
                          <GraduationCap className="w-3 h-3 mr-1" />
                          Teacher
                        </Badge>
                      )}
                      {user.role === "member" && (
                        <Badge variant="outline" data-testid={`badge-member-${user.id}`}>Member</Badge>
                      )}
                      {user.isPartner && (
                        <Badge variant="default" className="bg-purple-500/20 text-purple-400 border-purple-500/30" data-testid={`badge-partner-${user.id}`}>
                          <Handshake className="w-3 h-3 mr-1" />
                          Partner
                        </Badge>
                      )}
                      {user.isResident && (
                        <Badge variant="default" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" data-testid={`badge-resident-${user.id}`}>
                          <Home className="w-3 h-3 mr-1" />
                          Resident
                        </Badge>
                      )}
                      {user.isFounder && (
                        <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30" data-testid={`badge-founder-${user.id}`}>
                          <Rocket className="w-3 h-3 mr-1" />
                          Founder
                        </Badge>
                      )}
                      {user.isSpeaker && (
                        <Badge variant="default" className="bg-amber-500/20 text-amber-400 border-amber-500/30" data-testid={`badge-speaker-${user.id}`}>
                          <Mic className="w-3 h-3 mr-1" />
                          Speaker
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 break-all text-xs sm:text-sm" data-testid={`text-email-${user.id}`}>{user.email}</CardDescription>
                  </div>
                  {!user.isHeadAdmin && (
                    <div className="flex gap-2 flex-wrap">
                      <Dialog
                        open={changeRoleUserId === user.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setChangeRoleUserId(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setChangeRoleUserId(user.id)}
                            data-testid={`button-change-role-${user.id}`}
                            className="gap-2"
                          >
                            <UserCog className="w-4 h-4" />
                            Change Role
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background/95 backdrop-blur-xl border border-white/10">
                          <DialogHeader>
                            <DialogTitle>Change User Role</DialogTitle>
                            <DialogDescription>
                              Change role for {user.firstName} {user.lastName} ({user.email})
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Current Role</Label>
                              <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                            </div>
                            <div>
                              <Label htmlFor="newRole">New Role</Label>
                              <Select
                                defaultValue={user.role}
                                onValueChange={(value) => changeRoleMutation.mutate({ userId: user.id, role: value })}
                              >
                                <SelectTrigger data-testid={`select-role-${user.id}`}>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="teacher">Teacher</SelectItem>
                                  <SelectItem value="expert">Expert</SelectItem>
                                  <SelectItem value="lmsAdmin">LMS Admin</SelectItem>
                                  <SelectItem value="eventAdmin">Event Admin</SelectItem>
                                  <SelectItem value="innoLabsAdmin">InnoLabs Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-2">
                                <strong>Member:</strong> Basic access to courses and events<br />
                                <strong>Teacher:</strong> Can grade assignments and manage course content<br />
                                <strong>Expert:</strong> Can evaluate startups<br />
                                <strong>LMS Admin:</strong> Manages courses and programs<br />
                                <strong>Event Admin:</strong> Manages events<br />
                                <strong>InnoLabs Admin:</strong> Manages innovation and startups
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog
                        open={changePasswordUserId === user.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setChangePasswordUserId(null);
                            setNewPassword("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setChangePasswordUserId(user.id)}
                            data-testid={`button-change-password-${user.id}`}
                            className="gap-2"
                          >
                            <Key className="w-4 h-4" />
                            Change Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background/95 backdrop-blur-xl border border-white/10">
                          <DialogHeader>
                            <DialogTitle>Change Password</DialogTitle>
                            <DialogDescription>
                              Change password for {user.email}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="newPassword">New Password</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                placeholder="Minimum 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                data-testid={`input-new-password-${user.id}`}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => handleChangePassword(user.id)}
                              disabled={changePasswordMutation.isPending}
                              data-testid={`button-submit-password-${user.id}`}
                            >
                              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {user.isFrozen ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unfreezeUserMutation.mutate(user.id)}
                          disabled={unfreezeUserMutation.isPending}
                          data-testid={`button-unfreeze-${user.id}`}
                          className="gap-2"
                        >
                          <ShieldOff className="w-4 h-4" />
                          Unfreeze
                        </Button>
                      ) : (
                        <Dialog
                          open={freezeUserId === user.id}
                          onOpenChange={(open) => {
                            if (!open) { setFreezeUserId(null); setFreezeReason(""); }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setFreezeUserId(user.id)}
                              data-testid={`button-freeze-${user.id}`}
                              className="gap-2"
                            >
                              <Snowflake className="w-4 h-4" />
                              Freeze
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-background/95 backdrop-blur-xl border border-white/10">
                            <DialogHeader>
                              <DialogTitle>Freeze User Account</DialogTitle>
                              <DialogDescription>
                                Freeze account for {user.firstName} {user.lastName} ({user.email}). This will prevent the user from performing any actions on the platform.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="freezeReason">Reason (optional)</Label>
                                <Textarea
                                  id="freezeReason"
                                  placeholder="Why is this account being frozen?"
                                  value={freezeReason}
                                  onChange={(e) => setFreezeReason(e.target.value)}
                                  data-testid={`input-freeze-reason-${user.id}`}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => { setFreezeUserId(null); setFreezeReason(""); }}>
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => freezeUserMutation.mutate({ userId: user.id, reason: freezeReason })}
                                disabled={freezeUserMutation.isPending}
                                data-testid={`button-confirm-freeze-${user.id}`}
                              >
                                {freezeUserMutation.isPending ? "Freezing..." : "Freeze Account"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-xs sm:text-sm text-muted-foreground mb-4">
                  <div className="break-all">User ID: <span className="font-mono text-xs" data-testid={`text-userid-${user.id}`}>{user.id}</span></div>
                  {user.createdAt && (
                    <div>Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                  )}
                  {user.isFrozen && user.frozenReason && (
                    <div className="mt-1 text-destructive">Freeze reason: {user.frozenReason}</div>
                  )}
                </div>
                {!user.isHeadAdmin && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Additional Roles</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { field: "isPartner", label: "Partner", icon: Handshake, color: "text-purple-400" },
                        { field: "isResident", label: "Resident", icon: Home, color: "text-cyan-400" },
                        { field: "isFounder", label: "Founder", icon: Rocket, color: "text-blue-400" },
                        { field: "isSpeaker", label: "Speaker", icon: Mic, color: "text-amber-400" },
                      ].map(({ field, label, icon: Icon, color }) => (
                        <div key={field} className="flex items-center gap-2">
                          <Switch
                            checked={user[field as keyof User] as boolean}
                            onCheckedChange={(checked) =>
                              toggleAdditionalRoleMutation.mutate({ userId: user.id, field, value: checked })
                            }
                            data-testid={`switch-${field}-${user.id}`}
                          />
                          <Icon className={`w-4 h-4 ${color}`} />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
