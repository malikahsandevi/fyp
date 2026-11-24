"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, Brain, CloudUpload, FileText, HeartPulse, Play, ShieldCheck, Stethoscope, Zap,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UploadZone from "@/components/UploadZone";
import XrayVisual from "@/components/XrayVisual";

const features = [
  { Icon: Zap, title: "Instant Analysis", text: "Get results in seconds" },
  { Icon: Brain, title: "AI Powered", text: "Advanced Deep Learning" },
  { Icon: FileText, title: "Detailed Report", text: "Clear & Easy to Understand" },
  { Icon: ShieldCheck, title: "Secure & Private", text: "Your Data is Safe" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF3E8] via-[#FFF8F1] to-white">
          <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-[#FDEBD7] blur-2xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-2 lg:px-8 lg:pt-16">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="block h-1.5 w-14 rounded-full bg-[#F97316]" />
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[68px]">
                MedVision <span className="text-[#F97316]">AI</span>
              </h1>
              <p className="mt-4 text-2xl font-bold leading-snug sm:text-[28px]">
                Smart Chest X-Ray Analysis<br />with <span className="text-[#F97316]">AI Power</span>
              </p>
              <p className="mt-4 max-w-md text-base leading-relaxed text-[#0F1E33]/70">
                Upload a chest X-ray and get instant analysis with detailed insights.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#try" className="flex items-center gap-2 rounded-full bg-[#F97316] px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_-12px_rgba(249,115,22,0.9)] transition hover:bg-[#EA580C]">
                  <CloudUpload size={18} /> Upload X-Ray
                </a>
                <a href="#about" className="flex items-center gap-2 rounded-full border border-[#F97316]/60 bg-white px-7 py-3.5 text-sm font-bold text-[#0F1E33] transition hover:border-[#F97316]">
                  <Play size={16} /> Learn More
                </a>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.15 }} className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute -right-8 -top-8 h-64 w-64 rounded-full bg-[#FDEBD7]" />
              <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#FFF3E8]" />
              <div className="relative rotate-[3deg] rounded-[4px] bg-white p-2 shadow-[0_30px_60px_-25px_rgba(15,30,51,0.45)]">
                <XrayVisual className="aspect-[4/3] w-full rounded-[2px]" />
                <span className="absolute -left-3 -top-3 h-8 w-8 border-l-4 border-t-4 border-[#F97316]" />
                <span className="absolute -right-3 -top-3 h-8 w-8 border-r-4 border-t-4 border-[#F97316]" />
                <span className="absolute -bottom-3 -left-3 h-8 w-8 border-b-4 border-l-4 border-[#F97316]" />
                <span className="absolute -bottom-3 -right-3 h-8 w-8 border-b-4 border-r-4 border-[#F97316]" />
              </div>
              <div className="absolute -bottom-5 right-2 flex -rotate-2 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_36px_-16px_rgba(15,30,51,0.4)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316] text-white"><Brain size={20} /></span>
                <span>
                  <span className="block text-base font-extrabold text-[#F97316]">AI Powered</span>
                  <span className="block text-xs text-[#0F1E33]/60">DenseNet-121</span>
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* KEY FEATURES */}
        <section id="features" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-14 bg-[#F97316]" />
            <h2 className="text-3xl font-extrabold">Key Features</h2>
            <span className="h-px w-14 bg-[#F97316]" />
          </div>
          <p className="mt-2 text-center text-sm text-[#0F1E33]/60">Everything you need for smart and easy diagnosis</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ Icon, title, text }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.08 }} className="card p-7 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3E8] text-[#F97316]">
                  <Icon size={30} strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
                <p className="mt-1 text-sm text-[#0F1E33]/60">{text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* TRY IT NOW */}
        <section id="try" className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
          <div className="grid items-center gap-10 rounded-3xl bg-[#FFF3E8] p-8 sm:p-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-4xl font-extrabold">Try It Now</h2>
              <span className="mt-2 block h-1 w-12 rounded-full bg-[#F97316]" />
              <p className="mt-4 max-w-xs text-base leading-relaxed text-[#0F1E33]/70">
                Upload a chest X-ray image and see the magic of AI.
              </p>
              <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#0F1E33]/70">
                <CloudUpload size={18} className="text-[#F97316]" /> Use the upload panel — your result opens automatically.
              </p>
            </div>
            <UploadZone />
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 lg:grid-cols-2 lg:px-8">
          <div className="relative mx-auto flex h-[320px] w-full max-w-[420px] items-center justify-center">
            <div className="absolute left-2 top-8 h-56 w-56 rounded-full bg-[#FDEBD7]" />
            <div className="absolute bottom-4 right-6 h-32 w-32 rounded-full bg-[#FFF3E8]" />
            <div className="card relative flex h-56 w-56 flex-col items-center justify-center rounded-full bg-white">
              <Stethoscope size={84} className="text-[#16283F]" strokeWidth={1.2} />
              <HeartPulse size={34} className="mt-2 text-[#F97316]" />
            </div>
            <span className="absolute right-10 top-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F97316] text-4xl font-extrabold text-white shadow-lg">+</span>
          </div>
          <div>
            <span className="block h-1.5 w-14 rounded-full bg-[#F97316]" />
            <h2 className="mt-4 text-4xl font-extrabold">About MedVision <span className="text-[#F97316]">AI</span></h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#0F1E33]/70">
              MedVision AI is an intelligent medical assistant that helps in early detection of chest
              abnormalities using advanced AI technology.
            </p>
            <Link href="/#try" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#F97316] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#EA580C]">
              Know More <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
