"use client";

import React from "react";
import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white font-sans text-[#1F2937] antialiased">
      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="border-b border-[#D9E1E8] bg-[#F5F7FA] py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col gap-5 text-left">
              <div className="inline-flex items-center gap-2 self-start bg-[#003B73] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                SKILL & WORKFORCE INTELLIGENCE
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-[#003B73] sm:text-4xl lg:text-5xl leading-tight">
                Turn Workforce Data Into Better Decisions
              </h1>

              <p className="text-base leading-relaxed text-[#475569] sm:text-lg max-w-2xl">
                SkillPulse connects labour-market demand, skills, training and employment outcomes to identify workforce gaps and support evidence-based decisions.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/skills"
                  className="inline-flex items-center justify-center bg-[#005A9C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#003B73] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Explore Skill Intelligence
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center border border-[#005A9C] bg-white px-5 py-2.5 text-sm font-semibold text-[#005A9C] transition-colors hover:bg-[#EFF6FF]"
                >
                  How It Works
                </a>

                <Show when="signed-out">
                  <SignInButton>
                    <button className="inline-flex items-center justify-center border border-[#D9E1E8] bg-white px-5 py-2.5 text-sm font-semibold text-[#003B73] transition-colors hover:bg-[#F5F7FA] cursor-pointer">
                      Sign In
                    </button>
                  </SignInButton>
                </Show>

                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center border border-[#003B73] bg-[#003B73] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002D59]"
                  >
                    Open Workspace Dashboard
                  </Link>
                </Show>
              </div>
            </div>

            {/* Right Column: Restrained Institutional Visual */}
            <div className="lg:col-span-5">
              <div className="border border-[#D9E1E8] bg-white p-5">
                <div className="bg-[#003B73] px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider mb-4">
                  SKILLPULSE INTELLIGENCE
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                    <span className="font-bold text-[#003B73] block">Labour Market</span>
                    <span className="text-[#64748B] text-[11px]">Employer demand & hiring signals</span>
                  </div>
                  <div className="text-center text-[#005A9C] font-bold text-sm">↓</div>
                  <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                    <span className="font-bold text-[#003B73] block">Skills</span>
                    <span className="text-[#64748B] text-[11px]">Competency mapping & taxonomies</span>
                  </div>
                  <div className="text-center text-[#005A9C] font-bold text-sm">↓</div>
                  <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                    <span className="font-bold text-[#003B73] block">Training & Curriculum</span>
                    <span className="text-[#64748B] text-[11px]">Module coverage & institute capacity</span>
                  </div>
                  <div className="text-center text-[#005A9C] font-bold text-sm">↓</div>
                  <div className="p-3 border border-[#005A9C] bg-[#EFF6FF]">
                    <span className="font-bold text-[#003B73] block">Employment Outcomes</span>
                    <span className="text-[#005A9C] text-[11px]">Placement tracking & outcome verification</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — THE PROBLEM
          ============================================================ */}
      <section className="py-12 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">Bridging the Gap Between Skills and Demand</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-4">
              <h3 className="text-sm font-bold text-[#003B73]">Industry Demand</h3>
              <p className="text-xs text-[#64748B] mt-1">What employers need.</p>
            </div>
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-4">
              <h3 className="text-sm font-bold text-[#003B73]">Skills</h3>
              <p className="text-xs text-[#64748B] mt-1">What candidates and workers have.</p>
            </div>
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-4">
              <h3 className="text-sm font-bold text-[#003B73]">Training</h3>
              <p className="text-xs text-[#64748B] mt-1">What institutions teach and can provide.</p>
            </div>
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-4">
              <h3 className="text-sm font-bold text-[#003B73]">Employment</h3>
              <p className="text-xs text-[#64748B] mt-1">What happens after training.</p>
            </div>
          </div>

          <div className="mt-6 border-l-4 border-[#005A9C] bg-[#EFF6FF] p-4 text-xs font-bold text-[#003B73]">
            High demand does not automatically mean more training is the answer.
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — HOW SKILLPULSE WORKS
          ============================================================ */}
      <section id="how-it-works" className="py-12 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">From Data to Decisions</h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border border-[#D9E1E8] bg-white p-4 text-xs font-bold text-[#003B73]">
            <span className="p-2 border border-[#D9E1E8] bg-[#F5F7FA]">Collect</span>
            <span>→</span>
            <span className="p-2 border border-[#D9E1E8] bg-[#F5F7FA]">Validate</span>
            <span>→</span>
            <span className="p-2 border border-[#D9E1E8] bg-[#F5F7FA]">Analyse</span>
            <span>→</span>
            <span className="p-2 border border-[#D9E1E8] bg-[#F5F7FA]">Identify Gaps</span>
            <span>→</span>
            <span className="p-2 border border-[#D9E1E8] bg-[#F5F7FA]">Recommend</span>
            <span>→</span>
            <span className="p-2 border border-[#005A9C] bg-[#EFF6FF] text-[#005A9C]">Measure</span>
          </div>

          <p className="mt-4 text-xs text-[#475569]">
            SkillPulse combines labour-market, employer, training and employment evidence to identify real workforce mismatches and support actionable decisions.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — WHAT SKILLPULSE IDENTIFIES
          ============================================================ */}
      <section className="py-12 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">Identify the Real Workforce Gap</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs font-bold text-[#003B73]">
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-center">Skill Gap</div>
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-center">Curriculum Gap</div>
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-center">Capacity Gap</div>
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-center">Trainer Gap</div>
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-center">Geographic Gap</div>
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-center">Oversupply / Shortage</div>
          </div>

          <p className="mt-4 text-xs text-[#475569]">
            SkillPulse helps distinguish between different causes of workforce mismatch instead of assuming that every high-demand skill requires more training capacity.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — EVIDENCE & RECOMMENDATIONS
          ============================================================ */}
      <section className="py-12 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">Evidence Before Assumptions</h2>
            <span className="border border-[#D9E1E8] bg-white px-3 py-1 text-xs font-semibold text-[#005A9C]">
              Illustrative Example
            </span>
          </div>

          <div className="border border-[#003B73] bg-white p-5 text-xs text-[#334155]">
            <div className="flex flex-wrap items-center gap-2 font-bold text-[#003B73] mb-3">
              <span>Evidence</span>
              <span>→</span>
              <span>Confidence</span>
              <span>→</span>
              <span className="text-[#005A9C]">Recommendation</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#D9E1E8]">
              <p><strong>Recommendation:</strong> Update Curriculum</p>
              <p><strong>Confidence:</strong> Medium–High</p>
              <p><strong>Evidence:</strong> Strong employer demand with insufficient curriculum coverage.</p>
              <p><strong>Data Limitation:</strong> Evidence may be concentrated in selected districts.</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-[#475569]">
            SkillPulse surfaces evidence quality and limitations instead of hiding uncertainty.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — WHO IT SERVES (STAKEHOLDERS)
          ============================================================ */}
      <section className="py-12 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#003B73]">One Platform. Multiple Stakeholders.</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#003B73] mb-1">Government</h3>
                <p className="text-[#64748B]">Evidence for workforce and training decisions.</p>
              </div>
              <Link href="/dashboard" className="mt-3 font-bold text-[#005A9C] hover:underline">
                View Dashboard →
              </Link>
            </div>

            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#003B73] mb-1">Training Institutes</h3>
                <p className="text-[#64748B]">Align curriculum and capacity with demand.</p>
              </div>
              <Link href="/courses" className="mt-3 font-bold text-[#005A9C] hover:underline">
                Explore Courses →
              </Link>
            </div>

            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#003B73] mb-1">Employers</h3>
                <p className="text-[#64748B]">Provide requirements and industry feedback.</p>
              </div>
              <Link href="/employers" className="mt-3 font-bold text-[#005A9C] hover:underline">
                View Employers →
              </Link>
            </div>

            <div className="border border-[#D9E1E8] bg-[#F5F7FA] p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#003B73] mb-1">Learners</h3>
                <p className="text-[#64748B]">Understand required skills and career pathways.</p>
              </div>
              <Link href="/skills" className="mt-3 font-bold text-[#005A9C] hover:underline">
                Explore Skills →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7 — MAHARASHTRA MVP + FINAL CTA
          ============================================================ */}
      <section className="py-12 bg-[#003B73] text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-block bg-[#005A9C] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white mb-3">
            Pilot Scope
          </span>

          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
            Starting in Maharashtra. Built for India.
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-xs text-[#BFDBFE] leading-relaxed">
            Maharashtra serves as the initial MVP and validation environment, while the architecture is designed to scale across India&apos;s diverse labour markets.
          </p>

          <hr className="my-6 border-[#005A9C] max-w-xl mx-auto" />

          <h3 className="text-lg font-bold text-white mb-4">
            Make Workforce Decisions With Better Evidence
          </h3>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/skills"
              className="bg-[#005A9C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#003B73]"
            >
              Explore SkillPulse
            </Link>
            <Link
              href="/dashboard"
              className="border border-[#BFDBFE] bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002D59]"
            >
              Open Workspace Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
