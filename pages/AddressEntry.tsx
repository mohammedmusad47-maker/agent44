import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building, Home, MapPin, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AddressEntry = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [residenceType, setResidenceType] = useState<"house" | "flat">("house");
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    city: "",
    block: "",
    road: "",
    houseNumber: "",
    buildingNumber: "",
    flatNumber: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.city || !formData.block || !formData.road) {
      toast({
        title: "Incomplete Data",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return false;
    }

    if (residenceType === "house" && !formData.houseNumber) {
      toast({
        title: "Incomplete Data",
        description: "Please enter house number",
        variant: "destructive",
      });
      return false;
    }

    if (residenceType === "flat" && (!formData.buildingNumber || !formData.flatNumber)) {
      toast({
        title: "Incomplete Data",
        description: "Please enter building number and flat number",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Get current user
      const userString = localStorage.getItem("user");
      if (!userString) {
        toast({
          title: "Error",
          description: "User not found. Please login again.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const user = JSON.parse(userString);
      
      // Update profile with address data
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          address_completed: true,
          residence_type: residenceType,
          city: formData.city,
          block: formData.block,
          road: formData.road,
          house_number: residenceType === "house" ? formData.houseNumber : null,
          building_number: residenceType === "flat" ? formData.buildingNumber : null,
          flat_number: residenceType === "flat" ? formData.flatNumber : null,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Send data to n8n webhook
      const webhookData: any = {
        user_name: user.first_name || user.email,
        residence_type: residenceType,
        city: formData.city,
        block: formData.block,
        road: formData.road,
      };

      if (residenceType === "house") {
        webhookData.house_number = formData.houseNumber;
      } else {
        webhookData.building_number = formData.buildingNumber;
        webhookData.flat_number = formData.flatNumber;
      }

      const { error: webhookError } = await supabase.functions.invoke("send-address-to-n8n", {
        body: webhookData,
      });

      if (webhookError) {
        console.error("Webhook error:", webhookError);
      }

      // Update localStorage with new address data
      const updatedUser = {
        ...user,
        address_completed: true,
        residence_type: residenceType,
        city: formData.city,
        block: formData.block,
        road: formData.road,
        house_number: residenceType === "house" ? formData.houseNumber : null,
        building_number: residenceType === "flat" ? formData.buildingNumber : null,
        flat_number: residenceType === "flat" ? formData.flatNumber : null,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast({
        title: "Success",
        description: "Address saved successfully!",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary">Enter Address</h1>
          <p className="text-sm text-muted-foreground">
            Please fill in your complete address details
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Select your residence type so we can customize the address fields for you
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setResidenceType("house")}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                residenceType === "house"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">House</span>
            </button>

            <button
              onClick={() => setResidenceType("flat")}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                residenceType === "flat"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Building className="w-5 h-5" />
              <span className="font-medium">Flat</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="City"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Block"
                value={formData.block}
                onChange={(e) => handleInputChange("block", e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Road"
                value={formData.road}
                onChange={(e) => handleInputChange("road", e.target.value)}
                className="pl-10"
              />
            </div>

            {residenceType === "house" ? (
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="House Number"
                  value={formData.houseNumber}
                  onChange={(e) => handleInputChange("houseNumber", e.target.value)}
                  className="pl-10"
                />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Building Number"
                    value={formData.buildingNumber}
                    onChange={(e) => handleInputChange("buildingNumber", e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Flat Number"
                    value={formData.flatNumber}
                    onChange={(e) => handleInputChange("flatNumber", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </>
            )}
          </div>

          <Button
            onClick={handleSaveAddress}
            disabled={isLoading}
            className="w-full h-12 text-base"
          >
            {isLoading ? "Saving..." : "Save Address"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddressEntry;