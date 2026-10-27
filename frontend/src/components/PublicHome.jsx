import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  Globe2,
  GraduationCap,
  LogIn,
  Menu,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const leadershipMessages = [
  {
    name: 'Leadership Message',
    designation: 'Director / Senior Leadership',
    message:
      'A dedicated space for leadership messages, guidance and perspectives that inspire continuous learning and professional growth across Fairmacs.',
  },
  {
    name: 'Management Perspective',
    designation: 'Senior Management',
    message:
      'Learning connects our people, processes and business functions. This platform brings that learning experience together in one place.',
  },
];

const insights = [
  {
    category: 'Company',
    title: 'About Fairmacs',
    description:
      'Learn about the organisation, its people, values and the journey behind the business.',
    icon: Building2,
  },
  {
    category: 'Learning',
    title: 'Learning & Development',
    description:
      'Explore structured learning designed to strengthen knowledge across business functions.',
    icon: GraduationCap,
  },
  {
    category: 'People',
    title: 'Our People',
    description:
      'A workplace learning environment built around people, collaboration and continuous development.',
    icon: Users,
  },
];

export default function PublicHome() {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = React.useState(false);

  const goToLogin = () => {
    setMobileMenu(false);
    navigate('/login');
  };

  const scrollToSection = (id) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <div className="min-h-screen bg-[#06111f] text-white overflow-x-hidden">

      {/* =====================================================
          NAVBAR
      ====================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl px-5 py-3 shadow-2xl">

            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-400/30">
                <Building2 size={21} className="text-blue-300" />
              </div>

              <div className="text-left">
                <div className="font-bold tracking-wide">FAIRMACS</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Knowledge Management System
                </div>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300">
              <button
                onClick={() => scrollToSection('about')}
                className="hover:text-white transition"
              >
                About
              </button>

              <button
                onClick={() => scrollToSection('leadership')}
                className="hover:text-white transition"
              >
                Leadership
              </button>

              <button
                onClick={() => scrollToSection('insights')}
                className="hover:text-white transition"
              >
                Insights
              </button>

              <button
                onClick={() => scrollToSection('learning')}
                className="hover:text-white transition"
              >
                Learning
              </button>
            </nav>

            {/* Login */}
            <button
              onClick={goToLogin}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-2.5 text-sm font-semibold text-blue-100 hover:bg-blue-500/25 transition"
            >
              <LogIn size={17} />
              Login
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden rounded-lg p-2 hover:bg-white/10"
            >
              {mobileMenu ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>

          {mobileMenu && (
            <div className="md:hidden mt-2 rounded-2xl border border-white/10 bg-[#0a1829]/95 backdrop-blur-xl p-4 space-y-2">
              {[
                ['About', 'about'],
                ['Leadership', 'leadership'],
                ['Insights', 'insights'],
                ['Learning', 'learning'],
              ].map(([label, id]) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  {label}
                </button>
              ))}

              <button
                onClick={goToLogin}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold"
              >
                <LogIn size={17} />
                Employee Login
              </button>
            </div>
          )}
        </div>
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative min-h-screen flex items-center pt-32 pb-20">

        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute top-1/3 -right-40 h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-indigo-500/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-200 mb-7">
                <Sparkles size={14} />
                Fairmacs Learning & Development
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                Learn.
                <br />
                <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-white bg-clip-text text-transparent">
                  Grow.
                </span>
                <br />
                Lead.
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
                A central learning platform designed to connect people,
                knowledge and professional development across Fairmacs.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <button
                  onClick={goToLogin}
                  className="group flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition"
                >
                  Employee Login
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition"
                  />
                </button>

                <button
                  onClick={() => scrollToSection('about')}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-slate-200 hover:bg-white/10 transition"
                >
                  Explore Fairmacs
                </button>
              </div>

              <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-blue-400" />
                  Secure employee access
                </div>

                <div className="flex items-center gap-2">
                  <GraduationCap size={17} className="text-blue-400" />
                  Structured learning
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-8 rounded-[3rem] bg-blue-500/10 blur-3xl" />

              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] backdrop-blur-2xl p-5 shadow-2xl">

                <div className="rounded-[1.5rem] border border-white/10 bg-[#0b1a2c] p-7">

                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <div className="text-sm text-slate-400">
                        FAIRMACS KMS
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        Learning Hub
                      </div>
                    </div>

                    <div className="h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
                      <BookOpen className="text-blue-300" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <GraduationCap className="text-blue-300 mb-4" />
                      <div className="text-2xl font-bold">Learning</div>
                      <div className="mt-1 text-xs text-slate-400">
                        Structured courses
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <Users className="text-cyan-300 mb-4" />
                      <div className="text-2xl font-bold">People</div>
                      <div className="mt-1 text-xs text-slate-400">
                        Connected teams
                      </div>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-blue-400/10 bg-gradient-to-r from-blue-500/10 to-cyan-500/5 p-5">
                      <div className="flex items-center gap-3">
                        <Globe2 className="text-blue-300" />
                        <div>
                          <div className="font-semibold">
                            Knowledge Across Functions
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Import • Export • Sales • Operations • Finance •
                            Compliance • Technology
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          ABOUT
      ====================================================== */}
      <section id="about" className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              About
            </div>

            <h2 className="mt-4 text-4xl font-bold">
              Knowledge is part of the journey.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-400">
              The Fairmacs KMS provides a central space for employees to
              access learning resources, understand business functions,
              develop professional capabilities and continue growing within
              the organisation.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              ['People First', 'Learning experiences built around employee development.'],
              ['Business Knowledge', 'Understand functions, processes and the wider organisation.'],
              ['Continuous Growth', 'Create a culture where learning continues beyond a single course.'],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 hover:bg-white/[0.06] transition"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5">
                  <ChevronRight className="text-blue-300" size={19} />
                </div>

                <h3 className="text-lg font-semibold">{title}</h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          LEADERSHIP
      ====================================================== */}
      <section
        id="leadership"
        className="py-24 bg-white/[0.025] border-y border-white/5"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Leadership
              </div>

              <h2 className="mt-4 text-4xl font-bold">
                Voices that guide us.
              </h2>
            </div>

            <p className="max-w-xl text-sm leading-6 text-slate-400">
              Leadership messages, perspectives and important communications
              can be published here for employees to access from one central
              platform.
            </p>
          </div>

          <div className="mt-12 grid lg:grid-cols-2 gap-6">
            {leadershipMessages.map((item, index) => (
              <article
                key={index}
                className="group rounded-3xl border border-white/10 bg-[#0a1829] p-7 hover:border-blue-400/20 transition"
              >
                <div className="flex items-start gap-5">

                  <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/10 border border-white/10 flex items-center justify-center">
                    <Users className="text-blue-300" size={26} />
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-blue-300">
                      Leadership Message
                    </div>

                    <h3 className="mt-2 text-xl font-semibold">
                      {item.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.designation}
                    </p>
                  </div>
                </div>

                <div className="mt-7 relative">
                  <Quote
                    size={32}
                    className="absolute -top-2 -left-1 text-blue-400/20"
                  />

                  <p className="pl-8 text-slate-300 leading-7">
                    {item.message}
                  </p>
                </div>

                <button className="mt-7 flex items-center gap-2 text-sm font-medium text-blue-300 group-hover:text-blue-200">
                  Read message
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition"
                  />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          INSIGHTS
      ====================================================== */}
      <section id="insights" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Fairmacs Insights
            </div>

            <h2 className="mt-4 text-4xl font-bold">
              More than courses.
            </h2>

            <p className="mt-5 text-slate-400 leading-7">
              A central place for company information, learning initiatives,
              people stories and important organisational updates.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {insights.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 hover:-translate-y-1 hover:bg-white/[0.06] transition duration-300"
                >
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-400/10 flex items-center justify-center">
                    <Icon className="text-blue-300" size={23} />
                  </div>

                  <div className="mt-6 text-xs uppercase tracking-wider text-blue-400">
                    {item.category}
                  </div>

                  <h3 className="mt-2 text-xl font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>

                  <button className="mt-6 flex items-center gap-2 text-sm text-slate-300 hover:text-white">
                    Explore
                    <ArrowRight size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          LEARNING
      ====================================================== */}
      <section
        id="learning"
        className="py-24 border-y border-white/5 bg-gradient-to-b from-blue-500/[0.04] to-transparent"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">

          <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
            <GraduationCap className="text-blue-300" size={31} />
          </div>

          <h2 className="mt-7 text-4xl sm:text-5xl font-bold">
            Your learning journey starts here.
          </h2>

          <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-slate-400">
            Access your courses, learning paths, assessments and professional
            development resources through the Fairmacs KMS.
          </p>

          <button
            onClick={goToLogin}
            className="mt-9 inline-flex items-center gap-3 rounded-xl bg-blue-600 px-7 py-4 font-semibold hover:bg-blue-500 transition shadow-xl shadow-blue-900/20"
          >
            <LogIn size={18} />
            Login to KMS
            <ArrowRight size={18} />
          </button>

        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col md:flex-row justify-between gap-8">

            <div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Building2 size={18} className="text-blue-300" />
                </div>

                <div>
                  <div className="font-semibold">FAIRMACS</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    Knowledge Management System
                  </div>
                </div>
              </div>

              <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
                A central learning and knowledge platform for Fairmacs
                employees.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-500">
              <button onClick={() => scrollToSection('about')}>
                About
              </button>

              <button onClick={() => scrollToSection('leadership')}>
                Leadership
              </button>

              <button onClick={() => scrollToSection('insights')}>
                Insights
              </button>

              <button onClick={goToLogin}>
                Login
              </button>
            </div>

          </div>

          <div className="mt-10 pt-6 border-t border-white/5 text-xs text-slate-600">
            © {new Date().getFullYear()} Fairmacs. Learning & Development.
          </div>

        </div>
      </footer>

    </div>
  );
}