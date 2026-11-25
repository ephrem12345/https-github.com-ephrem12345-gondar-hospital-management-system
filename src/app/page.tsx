"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Home,
  Grid,
  Settings,
  Info,
  Mail,
  Globe,
  Rocket,
  Play,
  Activity,
  User,
  Stethoscope,
  HeartPulse,
  FlaskConical,
  Pill,
  Users,
  Bed,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Headphones,
  Heart,
  ChevronDown,
  X,
  MapPin,
  Phone,
  LayoutDashboard,
  LogOut,
  Building2,
  Syringe,
  Eye,
  Smile,
  Baby,
  Brain,
  Crosshair,
} from "lucide-react";
import { authService } from "@/services";
import type { CurrentUser } from "@/types";
import { useTranslation, type Language } from "@/lib/i18n/I18nProvider";
import { getRoleDefaultDashboard, formatRoleTitle } from "@/config/roles";

interface DepartmentInfo {
  name: string;
  nameAm: string;
  roleKey: string;
  category: string;
  icon: typeof Stethoscope;
  description: string;
}

const HOSPITAL_DEPARTMENTS: DepartmentInfo[] = [
  { name: "Emergency Medicine", nameAm: "ድንገተኛ ሕክምና", roleKey: "doctor", category: "Critical Care", icon: Activity, description: "24/7 Trauma, acute resuscitation & triage" },
  { name: "Internal Medicine", nameAm: "የውስጥ ደዌ ሕክምና", roleKey: "doctor", category: "Clinical", icon: Stethoscope, description: "Chronic care, cardiology, endoscopy & ward" },
  { name: "General Surgery", nameAm: "አጠቃላይ ቀዶ ጥገና", roleKey: "doctor", category: "Surgical", icon: Crosshair, description: "Operating theaters, pre/post-op & surgical suites" },
  { name: "Pediatrics & Child Health", nameAm: "የህፃናት ሕክምና", roleKey: "doctor", category: "Clinical", icon: Baby, description: "Neonatal ICU, pediatric inpatient & immunization" },
  { name: "Gynecology & Obstetrics", nameAm: "የማህፀንና ፅንስ ሕክምና", roleKey: "doctor", category: "Maternal", icon: Heart, description: "Labor & delivery, antenatal care & maternity" },
  { name: "Intensive Care Unit (ICU)", nameAm: "ፅኑ ህሙማን ማቆያ (ICU)", roleKey: "nurse", category: "Critical Care", icon: HeartPulse, description: "Mechanical ventilation & multi-parameter monitoring" },
  { name: "Laboratory & Pathology", nameAm: "የላቦራቶሪና ፓቶሎጂ", roleKey: "laboratory", category: "Diagnostics", icon: FlaskConical, description: "Hematology, biochemistry, culture & PCR testing" },
  { name: "Pharmacy & Dispensing", nameAm: "ፋርማሲና መድኃኒት ማደያ", roleKey: "pharmacist", category: "Pharmaceutical", icon: Pill, description: "Prescription verification, compounding & inventory" },
  { name: "Radiology & Imaging", nameAm: "ራዲዮሎጂና ምስል ምርመራ", roleKey: "laboratory", category: "Diagnostics", icon: Cpu, description: "CT scan, digital X-Ray, ultrasound & MRI" },
  { name: "Reception & Triage", nameAm: "መስተንግዶና ምዝገባ", roleKey: "receptionist", category: "Administration", icon: Users, description: "Patient registration, digital MRN & queueing" },
  { name: "Billing & Cashier", nameAm: "ክፍያና ሂሳብ", roleKey: "finance", category: "Finance", icon: ClipboardList, description: "Invoicing, Chapa digital payments & insurance" },
  { name: "Hospital Administration", nameAm: "ሆስፒታል አስተዳደር", roleKey: "administrator", category: "Administration", icon: ShieldCheck, description: "Enterprise audit, RBAC security & staff directorate" },
  { name: "Ophthalmology", nameAm: "የዓይን ሕክምና", roleKey: "doctor", category: "Specialized", icon: Eye, description: "Cataract surgery, vision diagnostics & optical clinic" },
  { name: "Dentistry & Oral Surgery", nameAm: "የጥርስ ሕክምና", roleKey: "doctor", category: "Specialized", icon: Smile, description: "Orthodontics, restorative care & dental imaging" },
  { name: "Orthopedic Surgery", nameAm: "የአጥንት ሕክምና", roleKey: "doctor", category: "Surgical", icon: Building2, description: "Trauma surgery, joint reconstruction & casting" },
  { name: "Psychiatry & Mental Health", nameAm: "የአእምሮ ጤና ሕክምና", roleKey: "doctor", category: "Specialized", icon: Brain, description: "Psychological counseling, psychotherapy & inpatient" },
  { name: "Anesthesiology", nameAm: "ማደንዘዣ ሕክምና", roleKey: "doctor", category: "Surgical", icon: Syringe, description: "Perioperative anesthesia & critical pain relief" },
  { name: "Dermatology", nameAm: "የቆዳ ሕክምና", roleKey: "doctor", category: "Specialized", icon: Stethoscope, description: "Skin pathology, dermatologic laser & allergy care" },
];

export default function LandingPage() {
  const { language, setLanguage } = useTranslation();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isDepartmentsModalOpen, setIsDepartmentsModalOpen] = useState(false);
  const [isDepartmentsDropdownOpen, setIsDepartmentsDropdownOpen] = useState(false);
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const deptMenuRef = useRef<HTMLDivElement>(null);
  const servMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      if (typeof window === "undefined") return;
      const user = await authService.checkSession();
      if (isMounted) {
        setCurrentUser(user);
      }
    }
    void checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle outside clicks for header dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (deptMenuRef.current && !deptMenuRef.current.contains(e.target as Node)) {
        setIsDepartmentsDropdownOpen(false);
      }
      if (servMenuRef.current && !servMenuRef.current.contains(e.target as Node)) {
        setIsServicesDropdownOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authService.logout().catch(() => {});
    setCurrentUser(null);
  };

  const isAmharic = language === "am";

  const categories = ["All", "Clinical", "Surgical", "Diagnostics", "Critical Care", "Pharmaceutical", "Administration", "Specialized"];
  const filteredDepartments = selectedCategory === "All"
    ? HOSPITAL_DEPARTMENTS
    : HOSPITAL_DEPARTMENTS.filter(d => d.category === selectedCategory);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased font-sans selection:bg-blue-600 selection:text-white">
      {/* =========================================================================
          1. TOP NAVIGATION BAR (White Bar with Hospital Seal, GHMS & Navigation)
         ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left Brand Area */}
            <div className="flex items-center gap-3.5">
              <Link href="/" className="flex items-center gap-3 focus:outline-none">
                <div className="relative h-12 w-12 shrink-0 rounded-full border border-blue-100 bg-white p-0.5 shadow-xs overflow-hidden flex items-center justify-center">
                  <Image
                    src="/images/hospital-seal.png"
                    alt="Gondar Hospital Emblem"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-black tracking-tight text-blue-900 uppercase leading-none">
                    Gondar Hospital
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                    Care Today... Healthier Tomorrow
                  </span>
                </div>
              </Link>

              {/* Vertical Divider */}
              <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1" />

              {/* GHMS Text */}
              <div className="hidden sm:flex flex-col">
                <span className="text-lg font-black tracking-tight text-blue-600 leading-none">
                  GHMS
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                  Management System
                </span>
              </div>
            </div>

            {/* Center Navigation Links */}
            <nav className="hidden lg:flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
              </Link>

              {/* Departments Dropdown */}
              <div ref={deptMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsDepartmentsDropdownOpen(!isDepartmentsDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition"
                >
                  <Grid className="h-3.5 w-3.5 text-slate-500" />
                  <span>Departments</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {isDepartmentsDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">Hospital Departments</p>
                      <p className="text-[11px] text-slate-500">26 Specialized Units</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {HOSPITAL_DEPARTMENTS.slice(0, 8).map((dept) => (
                        <Link
                          key={dept.name}
                          href={`/login?role=${dept.roleKey}`}
                          onClick={() => setIsDepartmentsDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                        >
                          <dept.icon className="h-3.5 w-3.5 text-blue-600" />
                          <span className="truncate">{dept.name}</span>
                        </Link>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDepartmentsDropdownOpen(false);
                        setIsDepartmentsModalOpen(true);
                      }}
                      className="w-full mt-1 pt-2 border-t border-slate-100 text-center text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View All 26 Departments →
                    </button>
                  </div>
                )}
              </div>

              {/* Services Dropdown */}
              <div ref={servMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-500" />
                  <span>Services</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {isServicesDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50">
                    <Link
                      href="/patient-portal"
                      onClick={() => setIsServicesDropdownOpen(false)}
                      className="block px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                    >
                      Patient Portal & Telehealth
                    </Link>
                    <Link
                      href="/login?role=receptionist"
                      onClick={() => setIsServicesDropdownOpen(false)}
                      className="block px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                    >
                      Outpatient (OPD) Booking
                    </Link>
                    <Link
                      href="/login?role=laboratory"
                      onClick={() => setIsServicesDropdownOpen(false)}
                      className="block px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                    >
                      Laboratory & Diagnostic Hub
                    </Link>
                    <Link
                      href="/login?role=pharmacist"
                      onClick={() => setIsServicesDropdownOpen(false)}
                      className="block px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                    >
                      Pharmacy Dispensing & Inventory
                    </Link>
                  </div>
                )}
              </div>

              <a
                href="#features"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition"
              >
                <Info className="h-3.5 w-3.5 text-slate-500" />
                <span>About</span>
              </a>

              <a
                href="#footer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition"
              >
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span>Contact</span>
              </a>
            </nav>

            {/* Right Action Area */}
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div ref={langMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                  <span>{isAmharic ? "አማርኛ" : "English"}</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {isLangDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage("en");
                        setIsLangDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span>English</span>
                      {!isAmharic && <span className="text-blue-600 font-bold">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage("am");
                        setIsLangDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span>አማርኛ</span>
                      {isAmharic && <span className="text-blue-600 font-bold">✓</span>}
                    </button>
                  </div>
                )}
              </div>

              {/* User Profile Badge / Login Indicator */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={
                      currentUser.role?.toUpperCase() === "PATIENT"
                        ? "/patient-portal"
                        : getRoleDefaultDashboard(currentUser.role)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{formatRoleTitle(currentUser.role)}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs transition"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden bg-slate-900 min-h-[300px] sm:min-h-[360px] lg:min-h-[420px] flex items-center">
        {/* Background Hospital Building Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-banner-full.jpg"
            alt="Gondar Comprehensive Specialized Hospital Facade"
            fill
            className="object-cover object-right md:object-center"
            priority
          />
          {/* Subtle gradient overlay to keep text ultra-readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-900/70 to-blue-900/20" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
          <div className="max-w-2xl">
            {/* Pill: Advanced Healthcare Management */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium mb-4 shadow-sm">
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              <span>{isAmharic ? "ዘመናዊ የሆስፒታል አስተዳደር" : "Advanced Healthcare Management"}</span>
            </div>

            {/* Main Header */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Gondar Hospital{" "}
              <span className="block mt-1">
                Management <span className="text-sky-400">System</span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-3 text-sm sm:text-base text-slate-100 font-medium tracking-wide">
              {isAmharic
                ? "ጥራት ያለው ህክምና • የተሻለ አገልግሎት • ጤናማ ማህበረሰብ"
                : "Quality Healthcare • Better Service • Healthier Community"}
            </p>

            <p className="mt-1 text-xs text-slate-200/90">
              Welcome to Gondar Hospital. Select your account type to continue.
            </p>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#departments"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 transition hover:scale-102"
              >
                <Rocket className="h-4 w-4" />
                <span>Access System</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-semibold transition hover:scale-102"
              >
                <Play className="h-3.5 w-3.5 fill-white text-white" />
                <span>Watch Overview</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. HOSPITAL DEPARTMENTS SECTION (8 Distinct Login Portal Cards)
         ========================================================================= */}
      <section id="departments" className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Section Divider & Title with Pulse lines */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-3 text-blue-600 font-medium">
            <span className="h-px w-10 sm:w-16 bg-blue-200" />
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Hospital Departments
            </h2>
            <Activity className="h-5 w-5 text-blue-600" />
            <span className="h-px w-10 sm:w-16 bg-blue-200" />
          </div>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium">
            {isAmharic
              ? "የስራ ክፍልዎን ይምረጡ እና የሆስፒታል አገልግሎቶችን ያስተዳድሩ"
              : "Access your department and manage healthcare services"}
          </p>
        </div>

        {/* 8 Portal Cards Grid (4 Columns x 2 Rows) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Administrator Login */}
          <Link
            href="/login?role=administrator"
            className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-blue-500 transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <User className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Administrator Login
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                System administration and management
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Administrator Portal →
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          {/* 2. Doctor Login */}
          <Link
            href="/login?role=doctor"
            className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-sky-500 transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Stethoscope className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                Doctor Login
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Patient care and clinical management
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Doctor Portal →
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          {/* 3. Nurse Login */}
          <Link
            href="/login?role=nurse"
            className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-emerald-500 transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <HeartPulse className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Nurse Login
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Nursing care and patient monitoring
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Nurse Portal →
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          {/* 4. Laboratory Staff Login */}
          <Link
            href="/login?role=laboratory"
            className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-purple-500 transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                <FlaskConical className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Laboratory Staff Login
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Lab tests and results management
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Laboratory Portal →
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          {/* 5. Pharmacist Login */}
          <Link
            href="/login?role=pharmacist"
            className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-green-500 transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-green-500/20 group-hover:scale-105 transition-transform">
                <Pill className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-green-600 transition-colors">
                Pharmacist Login
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Medication and pharmacy management
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Pharmacy Portal →
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          {/* 6. Receptionist Login */}
          <Link
            href="/login?role=receptionist"
            className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-orange-500 transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                Receptionist Login
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Patient registration and front desk services
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Reception Portal →
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          {/* 7. Patient Login */}
          <Link
            href="/login?role=patient"
            className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-teal-500 transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                <Bed className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                Patient Login
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                View appointments and medical records
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Patient Portal →
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          {/* 8. Other Departments */}
          <button
            type="button"
            onClick={() => setIsDepartmentsModalOpen(true)}
            className="group relative flex flex-col justify-between text-left bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-indigo-500 transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Other Departments
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Access all departments and services
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                View More →
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* =========================================================================
          4. STATISTICS COUNTER STRIP (500+ Patients, 200+ Doctors, 300+ Beds)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-12">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* Stat 1 */}
            <div className="flex items-center gap-4 sm:justify-center">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">500+</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Happy Patients Daily</p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="flex items-center gap-4 sm:justify-center pt-4 sm:pt-0">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">200+</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Medical Professionals</p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="flex items-center gap-4 sm:justify-center pt-4 sm:pt-0">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bed className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">300+</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Hospital Beds</p>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="flex items-center gap-4 sm:justify-center pt-4 sm:pt-0">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">24/7</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Emergency Service</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. TRUST BADGES & PROMO CARD (Together for a Healthier Gondar)
         ========================================================================= */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: 5 Features Card */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex items-center">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 w-full text-center">
              {/* Feature 1 */}
              <div className="flex flex-col items-center">
                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Secure & Reliable</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Your data is protected</p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center">
                <div className="h-11 w-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-2">
                  <Cpu className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Modern Technology</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Advanced healthcare solutions</p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center">
                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Globe className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Multilingual Support</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">English & Amharic</p>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col items-center">
                <div className="h-11 w-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2">
                  <Headphones className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">24/7 Support</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Always here for you</p>
              </div>

              {/* Feature 5 */}
              <div className="flex flex-col items-center col-span-2 sm:col-span-1">
                <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
                  <Heart className="h-5 w-5 fill-rose-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Quality Healthcare</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Our commitment</p>
              </div>
            </div>
          </div>

          {/* Right: Together for a Healthier Gondar Promo Card */}
          <div className="lg:col-span-4 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-100 via-sky-50 to-blue-200 border border-blue-200/60 p-6 flex items-center justify-between shadow-xs">
            <div className="relative z-10 max-w-[170px] sm:max-w-[190px]">
              <h3 className="text-base sm:text-lg font-black text-blue-950 leading-tight">
                Together for a Healthier Gondar
              </h3>
              <a
                href="#departments"
                className="mt-4 inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
              >
                <span>Learn More</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>

            {/* Doctor Portrait Image */}
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-md">
              <Image
                src="/images/doctor-portrait.png"
                alt="Smiling Doctor Gondar Hospital"
                fill
                className="object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>
      </main>

      <footer id="footer" className="mt-auto bg-dark-blue text-slate-300 pt-12 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            {/* Column 1: Hospital Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-12 w-12 rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                  <Image
                    src="/images/hospital-seal.png"
                    alt="Gondar Hospital Emblem"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white tracking-wide uppercase">
                    Gondar Hospital
                  </h4>
                  <p className="text-xs font-black text-sky-400">GHMS</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Better Care, Brighter Future
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Gondar Comprehensive Specialized Hospital is dedicated to excellence in patient care, clinical education, and medical research.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/" className="hover:text-sky-400 transition">
                    Home
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsDepartmentsModalOpen(true)}
                    className="hover:text-sky-400 transition text-left"
                  >
                    Departments
                  </button>
                </li>
                <li>
                  <a href="#features" className="hover:text-sky-400 transition">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#footer" className="hover:text-sky-400 transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact Information */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Contact Information
              </h4>
              <ul className="space-y-3 text-xs">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Gondar, Ethiopia</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>+251 58 111 1111</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>info@gondarhospital.et</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Language
              </h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Choose your preferred language for the hospital portal.
              </p>
              <div className="mt-4 max-w-[12rem]">
                <label htmlFor="landing-language" className="ghms-label text-slate-400">
                  Preferred language
                </label>
                <select
                  id="landing-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="am">አማርኛ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© 2026 Gondar Hospital Management System (GHMS). All rights reserved.</p>
            <p>Committed to quality healthcare in Gondar</p>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          7. ALL 26 DEPARTMENTS MODAL (Opened by 'Other Departments' / 'View More')
         ========================================================================= */}
      {isDepartmentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Gondar Hospital Departments Directory</h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Select a clinical or administrative department to access its portal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDepartmentsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-blue-700 text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Department Grid */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map((dept) => {
                const IconComponent = dept.icon;
                return (
                  <Link
                    key={dept.name}
                    href={`/login?role=${dept.roleKey}`}
                    onClick={() => setIsDepartmentsModalOpen(false)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md transition group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          {dept.category}
                        </span>
                        <IconComponent className="h-4 w-4 text-blue-600" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {isAmharic ? dept.nameAm : dept.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {dept.description}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                      <span>Login to {dept.roleKey}</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. WATCH OVERVIEW VIDEO MODAL
         ========================================================================= */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="relative w-full max-w-2xl bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden p-6 text-white text-center">
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="h-14 w-14 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <Play className="h-6 w-6 fill-blue-400 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold">Gondar Comprehensive Specialized Hospital</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
              Experience the unified digital healthcare workflow: from patient registration and triage to laboratory diagnostic automation, pharmacy dispensing, and critical inpatient care.
            </p>
            <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
              <p className="text-xs font-semibold text-sky-400 mb-2">Hospital Quick Tour Highlights:</p>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                <li>One unified electronic medical record (EMR) system</li>
                <li>Real-time doctor-nurse-laboratory clinical messaging</li>
                <li>Chapa digital banking and medical cashier integration</li>
                <li>Amharic and English bilingual patient accessibility</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(false)}
              className="mt-6 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
            >
              Close Overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
