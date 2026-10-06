/**
 * Login Page for SalesConnect
 * Password-based authentication with signup and forgot password.
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Beaker,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  User,
  Briefcase,
  Eye,
  EyeOff,
  ShieldQuestion,
  KeyRound,
} from "lucide-react";

type Step =
  | "login"
  | "signup"
  | "signup-otp"
  | "forgot-email"
  | "forgot-questions"
  | "forgot-reset";

const ALLOWED_DOMAIN = "analyticasofttech.com";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    signup,
    forgotPasswordVerify,
    forgotPasswordReset,
    getSecurityQuestions,
    isAuthenticated,
    requestOTP,
    verifyOTP,
  } = useAuth();

  // Form state
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion1, setSecurityQuestion1] = useState("");
  const [securityAnswer1, setSecurityAnswer1] = useState("");
  const [securityQuestion2, setSecurityQuestion2] = useState("");
  const [securityAnswer2, setSecurityAnswer2] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [availableQuestions, setAvailableQuestions] = useState<string[]>([]);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotQuestion1, setForgotQuestion1] = useState("");
  const [forgotQuestion2, setForgotQuestion2] = useState("");
  const [forgotAnswer1, setForgotAnswer1] = useState("");
  const [forgotAnswer2, setForgotAnswer2] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load security questions on mount
  useEffect(() => {
    const loadQuestions = async () => {
      const questions = await getSecurityQuestions();
      setAvailableQuestions(questions);
    };
    loadQuestions();
  }, [getSecurityQuestions]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = (location.state as any)?.from?.pathname || "/";
      if (from !== "/login") {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    const domain = email.split("@")[1]?.toLowerCase();
    return domain === ALLOWED_DOMAIN;
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Only @analyticasofttech.com company emails are allowed");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
  };

  // Handle Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Only @analyticasofttech.com company emails are allowed");
      return;
    }

    setIsLoading(true);
    const result = await requestOTP(email);
    setIsLoading(false);

    if (result.success) {
      setStep("signup-otp");
      setSuccess("Verification step ready. Use the demo code shown by the portal if requested.");
    } else {
      setError(result.message);
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    const result = await verifyOTP(email, otpCode);
    setIsLoading(false);

    if (result.success && result.verification_token) {
      setVerificationToken(result.verification_token);
      setStep("signup");
      setSuccess("Email verified! Please complete your profile.");
    } else {
      setError(result.message);
    }
  };

  // Handle Step 3: Final Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Only @analyticasofttech.com company emails are allowed");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !role.trim()) {
      setError("All fields are required");
      return;
    }

    if (!securityQuestion1 || !securityQuestion2) {
      setError("Please select both security questions");
      return;
    }

    if (securityQuestion1 === securityQuestion2) {
      setError("Please select two different security questions");
      return;
    }

    if (!securityAnswer1.trim() || !securityAnswer2.trim()) {
      setError("Please answer both security questions");
      return;
    }

    setIsLoading(true);
    const result = await signup({
      email,
      password,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role: role.trim(),
      security_question_1: securityQuestion1,
      security_answer_1: securityAnswer1.trim(),
      security_question_2: securityQuestion2,
      security_answer_2: securityAnswer2.trim(),
      verification_token: verificationToken,
    });
    setIsLoading(false);

    if (result.success) {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
  };

  // Handle forgot password - verify email
  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!forgotEmail.trim()) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);
    const result = await forgotPasswordVerify(forgotEmail);
    setIsLoading(false);

    if (result.success) {
      setForgotQuestion1(result.security_question_1 || "");
      setForgotQuestion2(result.security_question_2 || "");
      setStep("forgot-questions");
    } else {
      setError(result.message);
    }
  };

  // Handle forgot password - answer questions and reset
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!forgotAnswer1.trim() || !forgotAnswer2.trim()) {
      setError("Please answer both security questions");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const result = await forgotPasswordReset({
      email: forgotEmail,
      security_answer_1: forgotAnswer1.trim(),
      security_answer_2: forgotAnswer2.trim(),
      new_password: newPassword,
    });
    setIsLoading(false);

    if (result.success) {
      setSuccess("Password reset successfully! You can now login.");
      // Reset forgot password state
      setForgotEmail("");
      setForgotAnswer1("");
      setForgotAnswer2("");
      setNewPassword("");
      setConfirmNewPassword("");
      setStep("login");
    } else {
      setError(result.message);
    }
  };

  // Switch to signup mode
  const goToSignup = () => {
    setStep("signup-otp"); // Start with email entry for OTP
    setError("");
    setSuccess("");
  };

  // Switch to login mode
  const goToLogin = () => {
    setStep("login");
    setError("");
    setSuccess("");
  };

  // Switch to forgot password mode
  const goToForgotPassword = () => {
    setStep("forgot-email");
    setError("");
    setSuccess("");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              <img
                src="/company_logo.png"
                alt="Analytica Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1
                className="text-xl font-normal leading-none tracking-[0.05em] mb-1.5"
                style={{ fontFamily: "'Ethnocentric', sans-serif" }}
              >
                <span className="text-[#E31E24]">ANALYTICA</span>{" "}
                <span className="text-[#FDB913]">SOFT</span>
                <span className="text-[#FDB913]">-</span>
                <span className="text-[#0072BC]">TECH</span>
              </h1>
              <p className="text-[11px] font-bold text-[#2E3192] leading-tight tracking-[0.1em] uppercase">
                TRAINING & TESTING CENTRE
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Tender
              <br />
              Intelligence Portal
            </h2>
            <p className="text-sidebar-muted text-lg max-w-md">
              Automating the discovery, analysis, and tracking of institutional procurement tenders.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sidebar-muted">
            <CheckCircle2 className="w-5 h-5 text-sidebar-primary" />
            <span>Automated Portal Scraping</span>
          </div>
          <div className="flex items-center gap-3 text-sidebar-muted">
            <CheckCircle2 className="w-5 h-5 text-sidebar-primary" />
            <span>AI Specifications Extraction</span>
          </div>
          <div className="flex items-center gap-3 text-sidebar-muted">
            <CheckCircle2 className="w-5 h-5 text-sidebar-primary" />
            <span>Daily Intelligence Reports</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <img
                src="/company_logo.png"
                alt="Analytica Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1
                className="text-base font-normal leading-none tracking-[0.05em] mb-1"
                style={{ fontFamily: "'Ethnocentric', sans-serif" }}
              >
                <span className="text-[#E31E24]">ANALYTICA</span>{" "}
                <span className="text-[#FDB913]">SOFT</span>
                <span className="text-[#FDB913]">-</span>
                <span className="text-[#0072BC]">TECH</span>
              </h1>
              <p className="text-[9px] font-bold text-[#2E3192] leading-tight tracking-[0.1em] uppercase">
                TRAINING & TESTING CENTRE
              </p>
            </div>
          </div>

          {/* ============== LOGIN FORM ============== */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Welcome Back
                </h2>
                <p className="text-muted-foreground">
                  Sign in with your company email
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-foreground">
                    Email Address
                  </Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@analyticasofttech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      className="pl-10 h-12"
                      autoFocus
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Only @analyticasofttech.com company emails are allowed
                  </p>
                </div>

                <div>
                  <Label htmlFor="password" className="text-foreground">
                    Password
                  </Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goToForgotPassword}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@analyticasofttech.com");
                    setPassword("demo123");
                  }}
                  className="w-full py-2.5 px-3 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Quick Fill Demo Account (admin@analyticasofttech.com)
                </button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={goToSignup}
                  className="text-primary hover:underline font-medium"
                >
                  Create one
                </button>
              </div>
            </form>
          )}

          {/* ============== SIGNUP STEP 1: REQUEST OTP ============== */}
          {step === "signup-otp" && (
            <form onSubmit={handleRequestOTP} className="space-y-6 animate-fade-in">
              <div>
                <button
                  type="button"
                  onClick={goToLogin}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Verify Email
                </h2>
                <p className="text-muted-foreground">
                  We'll send a code to your company email
                </p>
              </div>

              <div>
                <Label htmlFor="signup-email" className="text-foreground">
                  Company Email Address
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@analyticasofttech.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className="pl-10 h-12"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Only @analyticasofttech.com company emails are allowed
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* ============== SIGNUP STEP 2: VERIFY OTP ============== */}
          {step === "signup-otp" && verificationToken === "" && success.includes("Verification code sent") && (
            <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-in mt-6 pt-6 border-t">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Enter 6-Digit Code
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please enter the code sent to <strong>{email}</strong>
                </p>
              </div>

              <div>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="pl-10 h-12 text-2xl tracking-[0.5em] font-mono text-center"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify Code
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  className="text-sm text-primary hover:underline hover:text-primary/80"
                >
                  Didn't receive a code? Resend
                </button>
              </div>
            </form>
          )}

          {/* ============== SIGNUP STEP 3: CREATE PROFILE ============== */}
          {step === "signup" && (
            <form onSubmit={handleSignup} className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Complete Your Profile
                </h2>
                <p className="text-muted-foreground">
                  Almost there! Just a few more details.
                </p>
              </div>

              <div className="space-y-4">
                {/* Email (Locked) */}
                <div>
                  <Label className="text-foreground opacity-70">
                    Verified Email Address
                  </Label>
                  <div className="relative mt-2">
                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    <Input
                      value={email}
                      disabled
                      className="pl-10 h-11 bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-foreground">
                      First Name
                    </Label>
                    <div className="relative mt-2">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-foreground">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 mt-2"
                      required
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <Label htmlFor="role" className="text-foreground">
                    Your Role
                  </Label>
                  <div className="relative mt-2">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Input
                      id="role"
                      type="text"
                      placeholder="Sales Executive"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label
                      htmlFor="signup-password"
                      className="text-foreground"
                    >
                      Password
                    </Label>
                    <div className="relative mt-2">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 6 chars"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="confirm-password"
                      className="text-foreground"
                    >
                      Confirm
                    </Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 mt-2"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="signup-show-password"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded"
                  />
                  <Label
                    htmlFor="signup-show-password"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Show password
                  </Label>
                </div>

                {/* Security Questions */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldQuestion className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      Security Questions
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    These will be used to recover your password if you forget it.
                  </p>

                  <div className="space-y-3">
                    {/* Question 1 */}
                    <div>
                      <Label className="text-foreground text-sm">
                        Question 1
                      </Label>
                      <Select
                        value={securityQuestion1}
                        onValueChange={setSecurityQuestion1}
                      >
                        <SelectTrigger className="mt-1 h-11">
                          <SelectValue placeholder="Select a question" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableQuestions.map((q) => (
                            <SelectItem
                              key={q}
                              value={q}
                              disabled={q === securityQuestion2}
                            >
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        placeholder="Your answer"
                        value={securityAnswer1}
                        onChange={(e) => setSecurityAnswer1(e.target.value)}
                        className="mt-2 h-11"
                        required
                      />
                    </div>

                    {/* Question 2 */}
                    <div>
                      <Label className="text-foreground text-sm">
                        Question 2
                      </Label>
                      <Select
                        value={securityQuestion2}
                        onValueChange={setSecurityQuestion2}
                      >
                        <SelectTrigger className="mt-1 h-11">
                          <SelectValue placeholder="Select a question" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableQuestions.map((q) => (
                            <SelectItem
                              key={q}
                              value={q}
                              disabled={q === securityQuestion1}
                            >
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        placeholder="Your answer"
                        value={securityAnswer2}
                        onChange={(e) => setSecurityAnswer2(e.target.value)}
                        className="mt-2 h-11"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Complete Signup
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* ============== FORGOT PASSWORD - EMAIL ============== */}
          {step === "forgot-email" && (
            <form
              onSubmit={handleForgotVerify}
              className="space-y-6 animate-fade-in"
            >
              <div>
                <button
                  type="button"
                  onClick={goToLogin}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Forgot Password
                </h2>
                <p className="text-muted-foreground">
                  Enter your email to reset your password
                </p>
              </div>

              <div>
                <Label htmlFor="forgot-email" className="text-foreground">
                  Email Address
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@analyticasofttech.com"
                    value={forgotEmail}
                    onChange={(e) =>
                      setForgotEmail(e.target.value.toLowerCase())
                    }
                    className="pl-10 h-12"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading || !forgotEmail}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* ============== FORGOT PASSWORD - QUESTIONS ============== */}
          {step === "forgot-questions" && (
            <form
              onSubmit={handleForgotReset}
              className="space-y-5 animate-fade-in"
            >
              <div>
                <button
                  type="button"
                  onClick={() => setStep("forgot-email")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Answer Security Questions
                </h2>
                <p className="text-muted-foreground">
                  Answer the questions you set during signup
                </p>
              </div>

              <div className="space-y-4">
                {/* Question 1 */}
                <div>
                  <Label className="text-foreground text-sm font-medium">
                    {forgotQuestion1}
                  </Label>
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={forgotAnswer1}
                    onChange={(e) => setForgotAnswer1(e.target.value)}
                    className="mt-2 h-11"
                    autoFocus
                    required
                  />
                </div>

                {/* Question 2 */}
                <div>
                  <Label className="text-foreground text-sm font-medium">
                    {forgotQuestion2}
                  </Label>
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={forgotAnswer2}
                    onChange={(e) => setForgotAnswer2(e.target.value)}
                    className="mt-2 h-11"
                    required
                  />
                </div>

                {/* New Password */}
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      Set New Password
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor="new-password"
                        className="text-foreground text-sm"
                      >
                        New Password
                      </Label>
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 6 chars"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-2 h-11"
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="confirm-new-password"
                        className="text-foreground text-sm"
                      >
                        Confirm
                      </Label>
                      <Input
                        id="confirm-new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="mt-2 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="show-new-password"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded"
                    />
                    <Label
                      htmlFor="show-new-password"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Show password
                    </Label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
