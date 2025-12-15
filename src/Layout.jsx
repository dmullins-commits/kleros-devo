import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Dumbbell, 
  Upload,
  School,
  TrendingUp,
  Crown,
  Image as ImageIcon,
  Database,
  Clipboard,
  FileText,
  UserCog
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TeamProvider, useTeam } from "@/components/TeamContext";
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import TeamDropdown from "@/components/layout/TeamDropdown";

const allNavigationItems = [
  {
    title: "Command Center",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    featureKey: "dashboard"
  },
  {
    title: "Manage Roster",
    url: createPageUrl("Athletes"),
    icon: Users,
    featureKey: "athletes"
  },
  {
    title: "Manage Metrics",
    url: createPageUrl("Metrics"),
    icon: Target,
    featureKey: "metrics"
  },
  {
    title: "Testing Center",
    url: createPageUrl("TestingCenter"),
    icon: Clipboard,
    featureKey: "metrics"
  },
  {
    title: "Progress Tracking",
    url: createPageUrl("ProgressTracking"),
    icon: TrendingUp,
    featureKey: "progress"
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: FileText,
    featureKey: "progress"
  },
  {
    title: "Workout Builder",
    url: createPageUrl("Workouts"),
    icon: Dumbbell,
    featureKey: "workouts"
  },
  {
    title: "Data Upload",
    url: createPageUrl("Upload"),
    icon: Upload,
    featureKey: "upload"
  },

  {
    title: "Manage Users",
    url: createPageUrl("ManageUsers"),
    icon: UserCog,
    featureKey: "admin"
  },
];

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const { selectedOrganization } = useTeam();
  const [user, setUser] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [siteLogo] = useState("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b8df636a0ee4f52ceab427/982139d90_AppLogo1.png");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file || !selectedOrganization) return;
    
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const { Organization } = await import("@/entities/all");
      await Organization.update(selectedOrganization.id, { logo: file_url });
      window.location.reload(); // Refresh to show new logo
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setUploadingLogo(false);
    }
  };

  const navigationItems = allNavigationItems.filter(item => {
    if (!selectedOrganization || !selectedOrganization.enabled_features) {
      return true;
    }
    return selectedOrganization.enabled_features[item.featureKey] !== false;
  });

  return (
    <div className="min-h-screen flex w-full bg-[#0a0a0a] relative">
      {/* Site Logo Background Watermark */}
      {siteLogo && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${siteLogo})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '40%',
            opacity: 0.03,
            filter: 'grayscale(100%)'
          }}
        />
      )}

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&display=swap');
          
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          
          :root {
            --primary-gold: #c9a961;
            --dark-gold: #a67c52;
            --light-gold: #d4af37;
            --bronze: #8b7355;
            --sidebar-background: #0a0a0a;
            --sidebar-border: #c9a961;
            --sidebar-accent: #c9a961;
            --sidebar-accent-foreground: #000000;
            --sidebar-foreground: #ffffff;
            --sidebar-muted: #6b7280;
            --sidebar-muted-foreground: #9ca3af;
          }
        `}
      </style>
      
      <Sidebar className="border-r border-[#c9a961]/30 bg-black/95 backdrop-blur-sm shadow-2xl relative z-10 h-screen sticky top-0">
        <SidebarHeader className="border-b border-[#c9a961]/30 p-6 bg-gradient-to-b from-gray-950/95 to-black/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative group">
              <Avatar className="w-14 h-14 border-2 border-[#c9a961] shadow-lg shadow-[#c9a961]/50">
                <AvatarImage src={selectedOrganization?.logo} />
                <AvatarFallback className="bg-gradient-to-br from-[#d4af37] to-[#a67c52]">
                  <School className="w-7 h-7 text-black" />
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                {uploadingLogo ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#c9a961]" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-[#c9a961]" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e.target.files[0])}
                />
              </label>
              <div className="absolute -top-1 -right-1 w-5 h-5">
                <Crown className="w-5 h-5 text-[#d4af37] animate-pulse" />
              </div>
            </div>
            <TeamDropdown />
          </div>
        </SidebarHeader>
        
        <SidebarContent className="p-2 bg-black/95 backdrop-blur-sm">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-bold text-gray-400 uppercase tracking-wide px-3 py-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#c9a961]" />
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`group relative overflow-hidden rounded-lg transition-all duration-200 ${
                        location.pathname === item.url 
                          ? 'bg-gradient-to-r from-[#c9a961]/20 to-[#a67c52]/20 border border-[#c9a961]/50' 
                          : 'hover:border hover:border-gray-700 hover:bg-gray-900'
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                        <item.icon className={`w-5 h-5 transition-colors duration-200 ${
                          location.pathname === item.url ? 'text-[#d4af37]' : 'text-gray-400 group-hover:text-white'
                        }`} />
                        <span className={`font-semibold tracking-wide transition-colors duration-200 ${
                          location.pathname === item.url ? 'text-white' : 'text-gray-400 group-hover:text-white'
                        }`}>
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-[#c9a961]/30 p-6 bg-gradient-to-t from-gray-950/95 to-black/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37] to-[#a67c52] rounded-full flex items-center justify-center border-2 border-[#c9a961] shadow-lg shadow-[#c9a961]/50">
              <span className="text-black font-black text-lg">C</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate tracking-wide">COACH</p>
              <p className="text-xs text-gray-400 truncate font-semibold">Elite Performance</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col bg-transparent relative z-10">
        <header className="bg-black/95 backdrop-blur-sm border-b border-[#c9a961]/30 px-6 py-4 md:hidden">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-gray-900 p-2 rounded-lg transition-colors duration-200 text-white" />
            <h1 className="text-xl font-bold text-white">
              CENTRAL HIGH
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-transparent">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <TeamProvider>
        <SidebarProvider>
          <LayoutContent currentPageName={currentPageName}>
            {children}
          </LayoutContent>
        </SidebarProvider>
      </TeamProvider>
    </div>
  );
}