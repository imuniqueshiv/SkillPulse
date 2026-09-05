"use client";

import React from "react";
import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white font-sans text-[#1F2937] antialiased">
      {/* ============================================================
          1. HERO SECTION — GOVERNMENT PORTAL STYLE
          ============================================================ */}
      <section className="border-b border-[#D9E1E8] bg-[#F5F7FA] py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Information Header & Actions */}
            <div className="lg:col-span-7 flex flex-col gap-5 text-left">
              {/* Institutional Eyebrow */}
              <div className="inline-flex items-center gap-2 self-start rounded-xs bg-[#003B73] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                Skill & Workforce Intelligence
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl font-extrabold tracking-tight text-[#003B73] sm:text-4xl lg:text-5xl leading-tight">
                Turn Workforce Data Into Better Decisions
              </h1>

              {/* Short Description */}
              <p className="text-base leading-relaxed text-[#475569] sm:text-lg max-w-2xl">
                SkillPulse connects labour-market demand, skills, training and employment outcomes
                to identify workforce gaps and support evidence-based decisions.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/skills"
                  className="inline-flex items-center justify-center rounded-xs bg-[#005A9C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#003B73] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Explore Skill Intelligence
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-xs border border-[#005A9C] bg-white px-5 py-2.5 text-sm font-semibold text-[#005A9C] transition-colors hover:bg-[#EFF6FF]"
                >
                  How SkillPulse Works
                </a>

                <Show when="signed-out">
                  <SignInButton>
                    <button className="inline-flex items-center justify-center rounded-xs border border-[#D9E1E8] bg-white px-5 py-2.5 text-sm font-semibold text-[#003B73] transition-colors hover:bg-[#F5F7FA] cursor-pointer">
                      Sign In
                    </button>
                  </SignInButton>
                </Show>

                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-xs border border-[#003B73] bg-[#003B73] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002D59]"
                  >
                    Open Workspace Dashboard
                  </Link>
                </Show>
              </div>
            </div>

            {/* Right Column: Restrained Institutional Architecture Panel */}
            <div className="lg:col-span-5">
              <div className="rounded-xs border border-[#D9E1E8] bg-white p-5 shadow-xs">
                <div className="bg-[#003B73] px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider mb-4 flex justify-between items-center">
                  <span>SkillPulse Intelligence Flow</span>
                  <span className="text-[11px] font-normal text-[#BFDBFE]">Framework Standard</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                    <span className="font-bold text-[#003B73] block">01. Labour-Market Demand</span>
                    <span className="text-[#64748B] text-[11px]">Job vacancy frequency & employer skill postings</span>
                  </div>
                  <div className="text-center text-[#005A9C] font-bold text-sm">↓</div>
                  <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                    <span className="font-bold text-[#003B73] block">02. Skills Taxonomy</span>
                    <span className="text-[#64748B] text-[11px]">Competency mapping & qualification levels</span>
                  </div>
                  <div className="text-center text-[#005A9C] font-bold text-sm">↓</div>
                  <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                    <span className="font-bold text-[#003B73] block">03. Training & Curriculum</span>
                    <span className="text-[#64748B] text-[11px]">Module coverage & institute training capacity</span>
                  </div>
                  <div className="text-center text-[#005A9C] font-bold text-sm">↓</div>
                  <div className="p-3 border border-[#005A9C] bg-[#EFF6FF]">
                    <span className="font-bold text-[#003B73] block">04. Employment Outcomes</span>
                    <span className="text-[#005A9C] text-[11px]">Placement tracking & policy decision support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. GOVERNMENT-STYLE INFORMATION STATUS BAR
          ============================================================ */}
      <section className="border-b border-[#D9E1E8] bg-[#003B73] py-3 text-white text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#93C5FD]">Scope Environment:</span>
              <span className="text-white">Maharashtra MVP Validation Platform</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[#BFDBFE]">
              <span>Evidence-Driven Data Engine</span>
              <span>•</span>
              <span>Multi-Source Intelligence Integration</span>
              <span>•</span>
              <span>Confidence-Aware Recommendation Scoring</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          3. ABOUT SKILLPULSE SECTION
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-[#003B73] sm:text-3xl">About SkillPulse</h2>
            <p className="mt-3 text-base text-[#334155] leading-relaxed">
              SkillPulse is an evidence-driven skill and workforce intelligence platform that connects
              labour-market demand with skills, training, curriculum, capacity and employment outcomes.
              The platform supports institutional decision-makers by evaluating evidence reliability
              before generating policy or curriculum recommendations.
            </p>

            <hr className="my-8 border-[#D9E1E8]" />

            <h3 className="text-base font-bold text-[#003B73]">
              What SkillPulse Helps Decision-Makers Understand
            </h3>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#334155]">
              <div className="flex items-start gap-2.5 border-l-2 border-[#005A9C] pl-3 py-1">
                <span className="font-semibold text-[#003B73]">1. What skills are in demand?</span>
              </div>
              <div className="flex items-start gap-2.5 border-l-2 border-[#005A9C] pl-3 py-1">
                <span className="font-semibold text-[#003B73]">2. Where are the actual gaps?</span>
              </div>
              <div className="flex items-start gap-2.5 border-l-2 border-[#005A9C] pl-3 py-1">
                <span className="font-semibold text-[#003B73]">3. Why does the gap exist?</span>
              </div>
              <div className="flex items-start gap-2.5 border-l-2 border-[#005A9C] pl-3 py-1">
                <span className="font-semibold text-[#003B73]">4. How reliable is the evidence?</span>
              </div>
              <div className="flex items-start gap-2.5 border-l-2 border-[#005A9C] pl-3 py-1">
                <span className="font-semibold text-[#003B73]">5. What action should be considered?</span>
              </div>
              <div className="flex items-start gap-2.5 border-l-2 border-[#005A9C] pl-3 py-1">
                <span className="font-semibold text-[#003B73]">6. Did the intervention work?</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          4. THE WORKFORCE CHALLENGE (INSTITUTIONAL TABLE)
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">The Workforce Challenge</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Structural mismatches across five core operational workforce domains.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#D9E1E8] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B73] text-white">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider w-1/4">Workforce Area</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Identified Structural Challenge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1E8] text-[#334155]">
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3.5 font-bold text-[#003B73]">Skills Domain</td>
                  <td className="px-5 py-3.5">Skills taught in training institutions may not match actual industry requirements.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3.5 font-bold text-[#003B73]">Training Capacity</td>
                  <td className="px-5 py-3.5">Seat capacity and institute allocations may not match real-time regional hiring demand.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3.5 font-bold text-[#003B73]">Curriculum Coverage</td>
                  <td className="px-5 py-3.5">Course syllabi may not cover emerging tools, technologies, and practical modules.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3.5 font-bold text-[#003B73]">Employment Verification</td>
                  <td className="px-5 py-3.5">Post-training employment outcomes may be incomplete, uncertain, or unverified.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3.5 font-bold text-[#003B73]">Geographic Mismatch</td>
                  <td className="px-5 py-3.5">Training supply and employer demand may exist in different geographic locations.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============================================================
          5. HOW SKILLPULSE WORKS (PROCESS TIMELINE)
          ============================================================ */}
      <section id="how-it-works" className="py-12 lg:py-16 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#003B73]">How SkillPulse Works</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              The 7-stage continuous workforce intelligence framework.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {[
              { num: "01", stage: "Collect", detail: "Ingest multi-source data streams" },
              { num: "02", stage: "Validate", detail: "Check freshness & filter duplicates" },
              { num: "03", stage: "Analyse", detail: "Standardize skill taxonomies" },
              { num: "04", stage: "Identify Gaps", detail: "Compare demand vs supply" },
              { num: "05", stage: "Recommend", detail: "Generate explainable policy actions" },
              { num: "06", stage: "Measure", detail: "Track hiring & outcome verification" },
              { num: "07", stage: "Learn", detail: "Refine future recommendation models" },
            ].map((step, idx) => (
              <div key={idx} className="border border-[#D9E1E8] bg-[#F5F7FA] p-4 text-left">
                <span className="text-xs font-mono font-bold text-[#005A9C] block mb-1">
                  {step.num}
                </span>
                <h3 className="text-sm font-bold text-[#003B73]">{step.stage}</h3>
                <p className="text-[11px] text-[#64748B] mt-1 leading-snug">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          6. MULTI-SOURCE DATA
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#003B73]">Connecting Evidence From Multiple Sources</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Integrating inputs into a standardized intelligence engine.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Left: Input Sources */}
            <div className="border border-[#D9E1E8] bg-white p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#003B73] mb-4 pb-2 border-b border-[#D9E1E8]">
                Ecosystem Data Sources
              </h3>
              <ul className="space-y-2.5 text-xs text-[#334155]">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#005A9C]" />
                  <span>Government labour-market datasets</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#005A9C]" />
                  <span>Employment portals & job posting feeds</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#005A9C]" />
                  <span>Verified employer hiring requirements</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#005A9C]" />
                  <span>Industry skill surveys & feedback</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#005A9C]" />
                  <span>Training provider capacity data</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#005A9C]" />
                  <span>Curriculum & qualification standards</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#005A9C]" />
                  <span>Employment & placement outcome records</span>
                </li>
              </ul>
            </div>

            {/* Right: Processing Engine */}
            <div className="border border-[#005A9C] bg-[#EFF6FF] p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#003B73] mb-4 pb-2 border-b border-[#BFDBFE]">
                  SkillPulse Intelligence Pipeline
                </h3>
                <div className="space-y-3 text-xs text-[#003B73]">
                  <div className="p-3 bg-white border border-[#BFDBFE] font-medium">
                    1. Data Validation & Freshness Filtering
                  </div>
                  <div className="p-3 bg-white border border-[#BFDBFE] font-medium">
                    2. Skill Taxonomy Normalization
                  </div>
                  <div className="p-3 bg-white border border-[#BFDBFE] font-medium">
                    3. Regional Demand vs Supply Analysis
                  </div>
                  <div className="p-3 bg-white border border-[#BFDBFE] font-medium">
                    4. Gap Identification & Root Cause Diagnosis
                  </div>
                  <div className="p-3 bg-[#003B73] text-white font-bold">
                    5. Confidence-Aware Recommendation Output
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          7. EVIDENCE, RELIABILITY & CONFIDENCE PANEL
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">Evidence, Reliability & Confidence</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Standardized evidence evaluation criteria across all analytical outputs.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#D9E1E8] bg-white mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B73] text-white">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider w-1/4">Evidence Attribute</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Evaluation Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1E8] text-[#334155]">
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Source Provenance</td>
                  <td className="px-5 py-3">Identifies the specific origin and method of data collection.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Data Freshness</td>
                  <td className="px-5 py-3">Evaluates how recent the evidence is and flags stale listings.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Source Reliability</td>
                  <td className="px-5 py-3">Assesses the historical dependability of the contributing data stream.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">District Coverage</td>
                  <td className="px-5 py-3">Defines the geographical scope and district applicability of findings.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Cross-Validation</td>
                  <td className="px-5 py-3">Checks whether findings are supported across multiple independent sources.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Confidence Index</td>
                  <td className="px-5 py-3">Scores how strongly the underlying evidence supports the recommendation.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-[#005A9C] bg-[#EFF6FF] p-4 text-xs">
              <strong className="text-[#003B73] block mb-1">Missing data ≠ zero demand</strong>
              <p className="text-[#475569]">
                Absence of online postings does not equal zero employer demand. SkillPulse accounts for reporting gaps and informal hiring channels.
              </p>
            </div>
            <div className="border border-[#005A9C] bg-[#EFF6FF] p-4 text-xs">
              <strong className="text-[#003B73] block mb-1">Unknown employment status ≠ unemployed</strong>
              <p className="text-[#475569]">
                Unconfirmed post-training placement status is categorized separately from verified unemployment to prevent biased policy conclusions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          8. SKILL GAP ANALYSIS TAXONOMY
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">Identifying the Real Workforce Gap</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Standardized classification of workforce gap types.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#D9E1E8] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B73] text-white">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider w-1/4">Gap Classification</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Institutional Definition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1E8] text-[#334155]">
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Skill Gap</td>
                  <td className="px-5 py-3">Required employer skills are unavailable in the local workforce pool.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Proficiency Gap</td>
                  <td className="px-5 py-3">Skills exist, but candidate practical proficiency is below industry standards.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Curriculum Gap</td>
                  <td className="px-5 py-3">Existing course syllabi do not cover required market modules.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Capacity Gap</td>
                  <td className="px-5 py-3">Training seat capacity is insufficient to meet hiring demand.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Trainer Gap</td>
                  <td className="px-5 py-3">Qualified trainers for specialized technologies are insufficient.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Equipment Gap</td>
                  <td className="px-5 py-3">Required lab machinery or practical training infrastructure is unavailable.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Geographic Gap</td>
                  <td className="px-5 py-3">Training supply and employer hiring demand exist in different districts.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============================================================
          9. DEMAND VS SUPPLY COMPARISON
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#003B73]">Demand vs Supply Analysis</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Contrasting market demand factors against effective training supply factors.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-5">
              <h3 className="text-sm font-bold text-[#003B73] border-b border-[#D9E1E8] pb-2 mb-3">
                Demand Factors
              </h3>
              <ul className="space-y-1.5 text-xs text-[#334155]">
                <li>• Employer job posting frequency</li>
                <li>• Industry hiring announcements</li>
                <li>• Required skill competencies</li>
                <li>• District hiring concentrations</li>
                <li>• Emerging technology roles</li>
              </ul>
            </div>

            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-5">
              <h3 className="text-sm font-bold text-[#003B73] border-b border-[#D9E1E8] pb-2 mb-3">
                Supply Factors
              </h3>
              <ul className="space-y-1.5 text-xs text-[#334155]">
                <li>• Accredited course enrollments</li>
                <li>• Institute seat capacities</li>
                <li>• Curriculum module alignment</li>
                <li>• Trainer availability & readiness</li>
                <li>• Verified placement rates</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          10. CURRICULUM INTELLIGENCE TABLE
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#003B73]">Aligning Training With Industry Requirements</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Sample curriculum alignment evaluation matrix.
              </p>
            </div>
            <span className="border border-[#D9E1E8] bg-white px-3 py-1 text-xs font-semibold text-[#005A9C]">
              Illustrative Example
            </span>
          </div>

          <div className="overflow-x-auto border border-[#D9E1E8] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B73] text-white">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Required Skill</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Course Module Coverage</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Alignment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1E8] text-[#334155]">
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">High-Voltage Battery Safety</td>
                  <td className="px-5 py-3">Fully Covered in Unit 2</td>
                  <td className="px-5 py-3 text-emerald-700 font-bold">Covered</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">BMS Firmware Diagnostics</td>
                  <td className="px-5 py-3">Partial Theory Coverage Only</td>
                  <td className="px-5 py-3 text-amber-700 font-bold">Partially Covered</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">IoT Telematics Data Analysis</td>
                  <td className="px-5 py-3">Not Included in Syllabus</td>
                  <td className="px-5 py-3 text-red-700 font-bold">Missing</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-[#003B73]">Advanced Thermal Management</td>
                  <td className="px-5 py-3">Emerging Module Proposal</td>
                  <td className="px-5 py-3 text-blue-700 font-bold">Emerging</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============================================================
          11. RECOMMENDATIONS (DECISION SUPPORT PANEL)
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#003B73]">From Evidence to Action</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Explainable recommendation decision-support output.
              </p>
            </div>
            <span className="border border-[#D9E1E8] bg-[#F5F7FA] px-3 py-1 text-xs font-semibold text-[#005A9C]">
              Illustrative Example
            </span>
          </div>

          <div className="border-2 border-[#003B73] bg-[#F5F7FA] p-6 text-xs text-[#334155]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase text-[#003B73] mb-2 border-b border-[#D9E1E8] pb-1">
                  Diagnosed Situation
                </h3>
                <ul className="space-y-1">
                  <li>• <strong>Labour Demand:</strong> High</li>
                  <li>• <strong>Training Capacity:</strong> High</li>
                  <li>• <strong>Curriculum Alignment:</strong> Low</li>
                  <li>• <strong>Trainer Readiness:</strong> Adequate</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase text-[#003B73] mb-2 border-b border-[#D9E1E8] pb-1">
                  Recommended Action
                </h3>
                <p className="text-sm font-bold text-[#005A9C]">UPDATE CURRICULUM</p>
                <p className="mt-1 text-[#475569]">
                  Update the existing curriculum rather than creating additional training seats.
                </p>
                <p className="mt-2 text-[11px] font-semibold text-[#003B73]">
                  Evidence Confidence Index: Medium–High
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          12. EARLY WARNING SIGNALS
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">Early Workforce Signals</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Standardized signal indicators for policy intervention planning.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#D9E1E8] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B73] text-white">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider w-1/4">Signal Indicator</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Operational Definition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1E8] text-[#334155]">
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-red-700">Critical Skill Gap</td>
                  <td className="px-5 py-3">Hiring demand significantly exceeds effective trained supply.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-emerald-700">Emerging Skill</td>
                  <td className="px-5 py-3">Hiring demand is growing consistently across multiple districts.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-blue-700">Watch List</td>
                  <td className="px-5 py-3">Potential emerging demand with limited supporting evidence.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-amber-700">Oversupply Risk</td>
                  <td className="px-5 py-3">Training seat capacity significantly exceeds supported hiring demand.</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-5 py-3 font-bold text-gray-700">Data Risk</td>
                  <td className="px-5 py-3">Evidence is insufficient, conflicting, or unverified.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============================================================
          13. STAKEHOLDERS
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#003B73]">Designed for Workforce Stakeholders</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Tailored information streams for decision-makers across four key domains.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-5">
              <h3 className="text-base font-bold text-[#003B73] mb-2">Government & Policymakers</h3>
              <ul className="space-y-1 text-xs text-[#334155] mb-4">
                <li>• District skill gaps & regional trends</li>
                <li>• Emerging occupation identification</li>
                <li>• Training capacity optimization</li>
                <li>• Priority policy interventions</li>
              </ul>
              <Link href="/dashboard" className="text-xs font-bold text-[#005A9C] hover:underline">
                Open Executive Dashboard →
              </Link>
            </div>

            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-5">
              <h3 className="text-base font-bold text-[#003B73] mb-2">Training Institutes</h3>
              <ul className="space-y-1 text-xs text-[#334155] mb-4">
                <li>• Curriculum module gaps & health</li>
                <li>• Industry competency alignment</li>
                <li>• Trainer upskilling requirements</li>
                <li>• Lab & equipment planning</li>
              </ul>
              <Link href="/courses" className="text-xs font-bold text-[#005A9C] hover:underline">
                Explore Courses & Capacity →
              </Link>
            </div>

            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-5">
              <h3 className="text-base font-bold text-[#003B73] mb-2">Employers & Industry</h3>
              <ul className="space-y-1 text-xs text-[#334155] mb-4">
                <li>• Required skill & proficiency signals</li>
                <li>• Hiring demand specification</li>
                <li>• Emerging role definitions</li>
                <li>• Candidate readiness feedback</li>
              </ul>
              <Link href="/employers" className="text-xs font-bold text-[#005A9C] hover:underline">
                View Employer Intelligence →
              </Link>
            </div>

            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-5">
              <h3 className="text-base font-bold text-[#003B73] mb-2">Learners & Job Seekers</h3>
              <ul className="space-y-1 text-xs text-[#334155] mb-4">
                <li>• Target role skill requirements</li>
                <li>• Personal skill gap identification</li>
                <li>• Relevant accredited courses</li>
                <li>• Regional career pathways</li>
              </ul>
              <Link href="/skills" className="text-xs font-bold text-[#005A9C] hover:underline">
                Explore Skill Intelligence →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          14. MAHARASHTRA MVP TO INDIA ARCHITECTURE
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">Maharashtra MVP → India-Ready Architecture</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Validation environment to nationwide scalable platform.
            </p>
          </div>

          <div className="border border-[#D9E1E8] bg-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
              <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                <strong className="text-[#003B73] block">India</strong>
                <span className="text-[11px] text-[#64748B]">National Target</span>
              </div>
              <div className="p-3 border border-[#005A9C] bg-[#EFF6FF]">
                <strong className="text-[#003B73] block">Maharashtra</strong>
                <span className="text-[11px] text-[#005A9C] font-bold">Current MVP</span>
              </div>
              <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                <strong className="text-[#003B73] block">36 Districts</strong>
                <span className="text-[11px] text-[#64748B]">Regional Mapping</span>
              </div>
              <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                <strong className="text-[#003B73] block">Institutions</strong>
                <span className="text-[11px] text-[#64748B]">Training Capacity</span>
              </div>
              <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                <strong className="text-[#003B73] block">Employers</strong>
                <span className="text-[11px] text-[#64748B]">Hiring Demand</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#334155] leading-relaxed">
              Maharashtra serves as the initial MVP and validation environment for SkillPulse, proving the evidence pipeline before scaling across India&apos;s diverse state workforce ecosystems.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          15. CONTINUOUS FEEDBACK LOOP
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-[#003B73]">A Continuous Workforce Feedback Loop</h2>
          <p className="mt-1 text-sm text-[#64748B] max-w-2xl mx-auto">
            SkillPulse measures post-intervention outcomes to refine future gap detection.
          </p>

          <div className="mt-8 flex flex-wrap justify-center items-center gap-2 text-xs font-semibold text-[#003B73]">
            <span className="border border-[#D9E1E8] bg-[#F5F7FA] px-3 py-2">Employer Requirements</span>
            <span>→</span>
            <span className="border border-[#D9E1E8] bg-[#F5F7FA] px-3 py-2">SkillPulse Engine</span>
            <span>→</span>
            <span className="border border-[#D9E1E8] bg-[#F5F7FA] px-3 py-2">Training Action</span>
            <span>→</span>
            <span className="border border-[#D9E1E8] bg-[#F5F7FA] px-3 py-2">Trained Candidates</span>
            <span>→</span>
            <span className="border border-[#D9E1E8] bg-[#F5F7FA] px-3 py-2">Outcome Feedback</span>
            <span>→</span>
            <span className="border border-[#005A9C] bg-[#EFF6FF] px-3 py-2 text-[#005A9C]">Model Learning</span>
          </div>
        </div>
      </section>

      {/* ============================================================
          16. EXPECTED IMPACT
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">Expected Impact</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Core systemic workforce outcomes supported by SkillPulse.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div className="border border-[#D9E1E8] bg-white p-4">
              <strong className="text-[#005A9C] uppercase block mb-1">Reduce</strong>
              <span className="font-bold text-[#003B73] block mb-1">Curriculum-Industry Mismatch</span>
              <span className="text-[#64748B]">Align course modules directly with verified hiring competencies.</span>
            </div>

            <div className="border border-[#D9E1E8] bg-white p-4">
              <strong className="text-[#005A9C] uppercase block mb-1">Improve</strong>
              <span className="font-bold text-[#003B73] block mb-1">Training Relevance</span>
              <span className="text-[#64748B]">Focus state training resources on high-demand practical skills.</span>
            </div>

            <div className="border border-[#D9E1E8] bg-white p-4">
              <strong className="text-[#005A9C] uppercase block mb-1">Identify</strong>
              <span className="font-bold text-[#003B73] block mb-1">Emerging Skills Earlier</span>
              <span className="text-[#64748B]">Detect growth signals before skill shortages constrain industry.</span>
            </div>

            <div className="border border-[#D9E1E8] bg-white p-4">
              <strong className="text-[#005A9C] uppercase block mb-1">Plan</strong>
              <span className="font-bold text-[#003B73] block mb-1">Training Capacity</span>
              <span className="text-[#64748B]">Allocate institute seats based on regional district demand.</span>
            </div>

            <div className="border border-[#D9E1E8] bg-white p-4">
              <strong className="text-[#005A9C] uppercase block mb-1">Support</strong>
              <span className="font-bold text-[#003B73] block mb-1">Trainer Planning</span>
              <span className="text-[#64748B]">Identify faculty upskilling needs for emerging technologies.</span>
            </div>

            <div className="border border-[#D9E1E8] bg-white p-4">
              <strong className="text-[#005A9C] uppercase block mb-1">Improve</strong>
              <span className="font-bold text-[#003B73] block mb-1">Employment Outcomes</span>
              <span className="text-[#64748B]">Track verified hiring results to validate policy effectiveness.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          17. RESTRAINED FINAL CTA
          ============================================================ */}
      <section className="py-12 lg:py-16 bg-[#003B73] text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Make Workforce Decisions With Better Evidence
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#BFDBFE]">
            SkillPulse brings labour-market, skill, training and employment signals together to support informed workforce decisions.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href="/skills"
              className="rounded-xs bg-[#005A9C] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#003B73]"
            >
              Explore Skill Intelligence
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
