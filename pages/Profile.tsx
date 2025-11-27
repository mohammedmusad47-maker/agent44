import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Key,
  Globe, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Edit,
  Instagram
} from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import wsallkLogo from '@/assets/wsallk-logo.png';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar: string;
    address_completed?: boolean;
    residence_type?: string;
    city?: string;
    block?: string;
    road?: string;
    house_number?: string;
    building_number?: string;
    flat_number?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for stored user session
      const storedUser = localStorage.getItem('user');
      
      if (!storedUser) {
        navigate("/login");
        return;
      }

      const userData = JSON.parse(storedUser);
      
      // Fetch fresh profile data from Supabase for this specific user
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Use fresh data from Supabase
      setUser({
        name: profileData.first_name || "User",
        email: profileData.email || "",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.first_name}`,
        address_completed: profileData.address_completed,
        residence_type: profileData.residence_type,
        city: profileData.city,
        block: profileData.block,
        road: profileData.road,
        house_number: profileData.house_number,
        building_number: profileData.building_number,
        flat_number: profileData.flat_number,
      });
      
      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [editFormData, setEditFormData] = useState({
    city: "",
    block: "",
    road: "",
    houseNumber: "",
    buildingNumber: "",
    flatNumber: "",
  });
  const [editResidenceType, setEditResidenceType] = useState<"house" | "flat">("house");

  const menuItems = [
    {
      icon: Key,
      label: 'Change Password',
      subtitle: 'Update your password',
      action: () => setIsChangingPassword(true),
      disabled: false,
      highlight: false
    },
    {
      icon: CreditCard,
      label: 'Payment Methods',
      subtitle: '1 card saved',
      action: () => {},
      disabled: true,
      highlight: false
    },
    {
      icon: Globe,
      label: 'Language',
      subtitle: 'English',
      action: () => {},
      disabled: true,
      highlight: false
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      subtitle: 'Get assistance',
      action: () => setIsHelpDialogOpen(true),
      disabled: false,
      highlight: false
    }
  ];

  const handleEditAddress = () => {
    if (user?.address_completed) {
      setEditFormData({
        city: user.city || "",
        block: user.block || "",
        road: user.road || "",
        houseNumber: user.house_number || "",
        buildingNumber: user.building_number || "",
        flatNumber: user.flat_number || "",
      });
      setEditResidenceType(user.residence_type as "house" | "flat" || "house");
    }
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    if (!editFormData.city || !editFormData.block || !editFormData.road) {
      toast({
        title: "Incomplete Data",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editResidenceType === "house" && !editFormData.houseNumber) {
      toast({
        title: "Incomplete Data",
        description: "Please enter house number",
        variant: "destructive",
      });
      return;
    }

    if (editResidenceType === "flat" && (!editFormData.buildingNumber || !editFormData.flatNumber)) {
      toast({
        title: "Incomplete Data",
        description: "Please enter building number and flat number",
        variant: "destructive",
      });
      return;
    }

    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;
      
      const userData = JSON.parse(storedUser);

      // Update profile in Supabase
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          residence_type: editResidenceType,
          city: editFormData.city,
          block: editFormData.block,
          road: editFormData.road,
          house_number: editResidenceType === "house" ? editFormData.houseNumber : null,
          building_number: editResidenceType === "flat" ? editFormData.buildingNumber : null,
          flat_number: editResidenceType === "flat" ? editFormData.flatNumber : null,
        })
        .eq("id", userData.id);

      if (updateError) throw updateError;

      // Send data to n8n webhook
      const webhookData: any = {
        user_name: userData.first_name || userData.email,
        residence_type: editResidenceType,
        city: editFormData.city,
        block: editFormData.block,
        road: editFormData.road,
      };

      if (editResidenceType === "house") {
        webhookData.house_number = editFormData.houseNumber;
      } else {
        webhookData.building_number = editFormData.buildingNumber;
        webhookData.flat_number = editFormData.flatNumber;
      }

      await supabase.functions.invoke("send-address-to-n8n", {
        body: webhookData,
      });

      // Update localStorage
      const updatedUser = {
        ...userData,
        residence_type: editResidenceType,
        city: editFormData.city,
        block: editFormData.block,
        road: editFormData.road,
        house_number: editResidenceType === "house" ? editFormData.houseNumber : null,
        building_number: editResidenceType === "flat" ? editFormData.buildingNumber : null,
        flat_number: editResidenceType === "flat" ? editFormData.flatNumber : null,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Update state
      setUser(prev => prev ? {
        ...prev,
        residence_type: editResidenceType,
        city: editFormData.city,
        block: editFormData.block,
        road: editFormData.road,
        house_number: editResidenceType === "house" ? editFormData.houseNumber : null,
        building_number: editResidenceType === "flat" ? editFormData.buildingNumber : null,
        flat_number: editResidenceType === "flat" ? editFormData.flatNumber : null,
      } : null);

      setIsEditingAddress(false);
      toast({
        title: "Success",
        description: "Address updated successfully!",
      });
    } catch (error: any) {
      console.error("Error updating address:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update address",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    // Validate inputs
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        toast({
          title: "Error",
          description: "Current password is incorrect",
          variant: "destructive",
        });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      // Reset form and close
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      
      toast({
        title: "Success",
        description: "Password updated successfully!",
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    }
  };

  const handleSendHelp = () => {
    if (!helpMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter your message",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically send the message to your backend
    // For now, we'll just show a success message
    setIsHelpDialogOpen(false);
    setHelpMessage('');
    toast({
      title: "Thank you for contacting us",
      description: "We will get back to you soon!",
    });
  };

  const handleLogout = async () => {
    setIsLogoutDialogOpen(false);
    localStorage.removeItem('wsallk_user');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero px-4 pt-12 pb-8">
        <div className="flex items-center space-x-4 mb-6">
          <img src={wsallkLogo} alt="Wsallk" className="w-10 h-10" />
          <div>
            <h1 className="text-white text-2xl font-bold">Profile</h1>
            <p className="text-white/80">Manage your account</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6 -mt-4">
        {/* User Profile Card */}
        <Card className="shadow-foodgo-md border-0 bg-gradient-card">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Hello {user.name}</h2>
            <p className="text-muted-foreground">{user.email}</p>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card className="shadow-foodgo-sm border-0">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              
              return (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg transition-smooth ${
                    item.disabled
                      ? 'cursor-default hover:bg-muted/30'
                      : 'hover:bg-muted/50 cursor-pointer'
                  }`}
                  onClick={item.disabled ? undefined : item.action}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </div>
                  
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Change Password Dialog */}
        <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleChangePassword} className="flex-1">
                  Update Password
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Help & Support Dialog */}
        <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Help & Support</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Email</span>
                  <span className="text-sm text-muted-foreground">Wsallk@support.com</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Phone</span>
                  <span className="text-sm text-muted-foreground">17777777</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Message</label>
                <textarea
                  className="w-full min-h-[120px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe your issue or question..."
                  value={helpMessage}
                  onChange={(e) => setHelpMessage(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSendHelp} className="flex-1">
                  Send
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsHelpDialogOpen(false);
                    setHelpMessage('');
                  }} 
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Saved Address */}
        <Card className="shadow-foodgo-sm border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Saved Address</CardTitle>
            {user.address_completed && !isEditingAddress && (
              <Button variant="ghost" size="sm" onClick={handleEditAddress}>
                <Edit size={16} className="mr-1" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {user.address_completed ? (
              isEditingAddress ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => setEditResidenceType("house")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        editResidenceType === "house"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">House</span>
                    </button>
                    <button
                      onClick={() => setEditResidenceType("flat")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        editResidenceType === "flat"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Flat</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Input
                      placeholder="City"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                    <Input
                      placeholder="Block"
                      value={editFormData.block}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, block: e.target.value }))}
                    />
                    <Input
                      placeholder="Road"
                      value={editFormData.road}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, road: e.target.value }))}
                    />
                    {editResidenceType === "house" ? (
                      <Input
                        placeholder="House Number"
                        value={editFormData.houseNumber}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
                      />
                    ) : (
                      <>
                        <Input
                          placeholder="Building Number"
                          value={editFormData.buildingNumber}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, buildingNumber: e.target.value }))}
                        />
                        <Input
                          placeholder="Flat Number"
                          value={editFormData.flatNumber}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, flatNumber: e.target.value }))}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveAddress} className="flex-1">
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingAddress(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Residence Type</span>
                    <span className="font-medium capitalize">{user.residence_type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">City</span>
                    <span className="font-medium">{user.city}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Block</span>
                    <span className="font-medium">{user.block}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Road</span>
                    <span className="font-medium">{user.road}</span>
                  </div>
                  {user.residence_type === 'house' && user.house_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">House Number</span>
                      <span className="font-medium">{user.house_number}</span>
                    </div>
                  )}
                  {user.residence_type === 'flat' && (
                    <>
                      {user.building_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Building Number</span>
                          <span className="font-medium">{user.building_number}</span>
                        </div>
                      )}
                      {user.flat_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Flat Number</span>
                          <span className="font-medium">{user.flat_number}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            ) : (
              <p className="text-muted-foreground text-center py-4">No address saved yet</p>
            )}
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="shadow-foodgo-sm border-0">
          <CardHeader>
            <CardTitle>About Wsallk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:bg-muted/30 p-2 rounded-lg transition-smooth cursor-default">
                <Instagram size={20} />
                <span>@WsallkApp</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:bg-muted/30 p-2 rounded-lg transition-smooth cursor-default">
                <FaXTwitter size={20} />
                <span>@WsallkApp</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Version</span>
              <span className="text-muted-foreground">1.0.0</span>
            </div>
            <div className="flex items-center justify-between hover:bg-muted/30 p-2 rounded-lg transition-smooth cursor-pointer">
              <span>Terms & Conditions</span>
              <ChevronRight size={20} className="text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between hover:bg-muted/30 p-2 rounded-lg transition-smooth cursor-pointer">
              <span>Privacy Policy</span>
              <ChevronRight size={20} className="text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card className="shadow-foodgo-sm border-0">
          <CardContent className="p-6">
            <Button 
              variant="outline" 
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="mr-2" size={20} />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign Out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Footer */}
        <div className="text-center py-6">
          <img src={wsallkLogo} alt="Wsallk" className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Made with ❤️ by Wsallk Team</p>
        </div>
      </main>
    </div>
  );
};

export default Profile;