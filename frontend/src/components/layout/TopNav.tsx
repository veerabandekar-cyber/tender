import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  ChevronDown,
  FileText,
  Building2,
  BarChart3,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return "U";
  };

  const getFullName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.email || "User";
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const quickLinks = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Tenders", icon: FileText, path: "/tenders" },
    { label: "Organizations", icon: Building2, path: "/organizations" },
    { label: "Reports", icon: BarChart3, path: "/reports" },
    { label: "Settings", icon: SettingsIcon, path: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
            <img
              src="/company_logo.png"
              alt="Analytica Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <div className="flex flex-col">
              <h1
                className="text-[15px] font-normal leading-none tracking-[0.05em] mb-1"
                style={{ fontFamily: "'Ethnocentric', sans-serif" }}
              >
                <span className="text-[#E31E24]">ANALYTICA</span>{" "}
                <span className="text-[#FDB913]">SOFT</span>
                <span className="text-[#FDB913]">-</span>
                <span className="text-[#0072BC]">TECH</span>
              </h1>
              <p className="text-[10px] font-bold text-[#2E3192] leading-tight tracking-[0.1em] uppercase">
                TRAINING & TESTING CENTRE
              </p>
            </div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">
                  {getInitials()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-foreground">
                {user?.first_name || "User"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold">{getFullName()}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />

            {/* Mobile nav links */}
            <div className="md:hidden">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <DropdownMenuItem
                    key={link.path}
                    onClick={() => navigate(link.path)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </div>

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
