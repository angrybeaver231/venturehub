import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Trophy, 
  Users, 
  Rocket, 
  Calendar,
  ArrowRight,
  TrendingUp,
  Award,
  Briefcase,
  Mail
} from "lucide-react";
import { Link } from "wouter";
import techStarImage from "@assets/generated_images/TechStar_competition_rocket_launch_2454c85e.png";
import techStarLogo from "@assets/IMG_2456_1762045550797.png";
import speaker1 from "@assets/1_1762044771205.png";
import speaker2 from "@assets/IMG_2465_1762083534987.png";
import speaker3 from "@assets/3_1762044771205.png";
import speaker4 from "@assets/4_1762044771206.png";
import partnerLogo1 from "@assets/generated_images/InnovateLab_tech_company_logo_c5e20fe6.png";
import partnerLogo2 from "@assets/generated_images/VentureX_Capital_VC_logo_a7020a83.png";
import partnerLogo3 from "@assets/generated_images/LaunchPad_Pro_accelerator_logo_bc4b04c0.png";
import partnerLogo4 from "@assets/generated_images/FinTech_Academy_logo_aa0fa458.png";
import partnerLogo5 from "@assets/generated_images/StartHub_Moscow_logo_c6334b84.png";
import partnerLogo6 from "@assets/generated_images/TechSummit_conference_logo_f761e053.png";

export default function TechStarLanding() {
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Helper function for correct Russian conjugation
  const getDaysText = (count: number) => {
    if (count === 1) return "день";
    if (count >= 2 && count <= 4) return "дня";
    return "дней";
  };

  const roadmapStages = [
    {
      title: "От идеи до единорога",
      sessions: 6,
      description: "Изучите путь от идеи к созданию единорога-стартапа",
      icon: Rocket,
      color: "from-cyan-500 to-blue-600"
    },
    {
      title: "Практики - Стартапу",
      sessions: 4,
      description: "Практические воркшопы по созданию и развитию стартапа",
      icon: Briefcase,
      color: "from-blue-600 to-purple-600"
    },
    {
      title: "Pitch Days",
      sessions: 3,
      description: "Практикуйте питч вашего проекта перед экспертами",
      icon: Users,
      color: "from-purple-600 to-pink-600"
    },
    {
      title: "Квалификация",
      date: "4 декабря",
      description: "Отборочный этап для лучших команд",
      icon: TrendingUp,
      color: "from-pink-600 to-orange-600"
    },
    {
      title: "Финал",
      date: "5 декабря",
      description: "Грандфинал и награждение победителей",
      icon: Trophy,
      color: "from-orange-600 to-red-600"
    }
  ];

  const speakers = [
    {
      name: "Виктор Савюк",
      title: "Инвестор, автор Dendy",
      image: speaker1,
      expertise: "Российский инвестор, автор приставки под торговой маркой Dendy, президент компании «Акадо»"
    },
    {
      name: "Александр Капустин",
      title: "Сооснователь Cerca Trovo",
      image: speaker2,
      expertise: "Сооснователь и идейный вдохновитель Cerca Trovo"
    },
    {
      name: "Юлия Коровкина",
      title: "CEO & Founder FOOD2MOOD",
      image: speaker3,
      expertise: "CEO & Founder FOOD2MOOD"
    },
    {
      name: "Владимир Агинский",
      title: "Предприниматель",
      image: speaker4,
      expertise: "Предприниматель, с 2010 года привлек $650 млн"
    }
  ];

  const prizes = [
    {
      title: "Встреча с реальными инвесторами",
      description: "Личные встречи с ведущими венчурными фондами и бизнес-ангелами",
      icon: Award
    },
    {
      title: "Место в акселераторе",
      description: "Победители получают место в топ акселераторе с реальным финансированием",
      icon: Rocket
    },
    {
      title: "Менторская поддержка",
      description: "Индивидуальное менторство от успешных предпринимателей",
      icon: Users
    }
  ];

  const partners = [
    partnerLogo1,
    partnerLogo2,
    partnerLogo3,
    partnerLogo4,
    partnerLogo5,
    partnerLogo6
  ];

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-black overflow-hidden">
      {/* Space Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Deep space gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(30,27,75,0.4),transparent_70%)]" />
        
        {/* Nebula clouds */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(139,92,246,0.25),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(0,212,255,0.2),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_80%,rgba(59,130,246,0.15),transparent_45%)]" />
        
        {/* Starfield - Static stars */}
        <div className="absolute inset-0">
          {[...Array(150)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute w-px h-px bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.7 + 0.3,
                boxShadow: `0 0 ${Math.random() * 2 + 1}px rgba(255,255,255,${Math.random() * 0.5 + 0.5})`,
              }}
            />
          ))}
        </div>
        
        {/* Twinkling stars */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={`twinkle-${i}`}
            className="absolute w-0.5 h-0.5 rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 4px rgba(255,255,255,0.8)',
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}
        
        {/* Shooting stars */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`shooting-star-${i}`}
            className="absolute w-1 h-px bg-gradient-to-r from-transparent via-white to-transparent"
            style={{
              left: '-10%',
              top: `${Math.random() * 60}%`,
              transformOrigin: 'left center',
              rotate: '-45deg',
            }}
            animate={{
              x: ['0vw', '120vw'],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 8 + Math.random() * 5,
              ease: "easeIn",
            }}
          />
        ))}
        
        {/* Large Nebula Orbs */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-[500px] h-[500px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.7, 0.4],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600/30 via-indigo-500/20 to-transparent blur-3xl" />
          <div className="absolute inset-1/4 rounded-full bg-gradient-to-br from-purple-400/40 to-blue-600/30 blur-2xl" />
        </motion.div>

        <motion.div
          className="absolute bottom-1/3 left-1/5 w-96 h-96"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-500/30 via-blue-600/20 to-transparent blur-3xl glow-blue" />
        </motion.div>
        
        <motion.div
          className="absolute top-1/2 left-1/3 w-64 h-64"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.35, 0.55, 0.35],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-400/25 via-purple-500/15 to-transparent blur-3xl" />
        </motion.div>
        
        {/* Floating cosmic particles */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              background: i % 3 === 0 
                ? 'rgba(0,212,255,0.6)' 
                : i % 3 === 1 
                ? 'rgba(139,92,246,0.6)' 
                : 'rgba(255,255,255,0.8)',
              boxShadow: `0 0 ${Math.random() * 8 + 4}px ${
                i % 3 === 0 
                  ? 'rgba(0,212,255,0.8)' 
                  : i % 3 === 1 
                  ? 'rgba(139,92,246,0.8)' 
                  : 'rgba(255,255,255,0.6)'
              }`,
            }}
            animate={{
              y: [0, Math.random() * -100 - 50, 0],
              x: [0, Math.random() * 40 - 20, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          />
        ))}
        
        {/* Distant planets/celestial bodies */}
        <motion.div
          className="absolute top-20 right-32 w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-600/10 blur-sm"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            boxShadow: '0 0 30px rgba(139,92,246,0.4), inset -10px -10px 20px rgba(0,0,0,0.3)',
          }}
        />
        
        <motion.div
          className="absolute bottom-40 left-24 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-600/10 blur-sm"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          style={{
            boxShadow: '0 0 20px rgba(0,212,255,0.3), inset -8px -8px 15px rgba(0,0,0,0.4)',
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-end">
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button 
                asChild 
                variant="ghost" 
                className="text-gray-300 hover:text-white hidden sm:inline-flex"
              >
                <Link href="/login" data-testid="link-header-login">
                  Войти
                </Link>
              </Button>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  asChild 
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-cyan-500/30"
                >
                  <Link href="/register" data-testid="link-header-register">
                    Регистрация
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative py-32 md:py-40 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: Text Content */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-center lg:text-left space-y-8"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.3,
                    ease: [0.34, 1.56, 0.64, 1]
                  }}
                  className="inline-block"
                >
                  <div className="glass-card px-8 py-4 rounded-full border-2 border-cyan-400/30 glow-blue">
                    <p className="text-cyan-300 font-semibold text-sm md:text-base">
                      Конкурс стартапов 2025
                    </p>
                  </div>
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 1, 
                    delay: 0.5,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white"
                  data-testid="text-hero-title"
                >
                  TechStar
                  <motion.span 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      duration: 0.8, 
                      delay: 0.8,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
                  >
                    Launchpad
                  </motion.span>
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.9,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="text-xl md:text-2xl text-gray-300"
                  data-testid="text-hero-subtitle"
                >
                  Превратите свою идею в успешный стартап. Обучение, менторство, питчинг и встречи с реальными инвесторами.
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 1.1,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="flex gap-4 justify-center lg:justify-start flex-wrap"
                >
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Button size="lg" className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-cyan-500/30" asChild>
                      <Link href="/register" data-testid="link-hero-register">
                        Принять участие
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Button size="lg" className="bg-white text-black border-white hover:bg-gray-100 shadow-lg" onClick={() => {
                      document.getElementById("roadmap")?.scrollIntoView({ behavior: "smooth" });
                    }} data-testid="button-view-roadmap">
                      Посмотреть программу
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Right: Hero Image */}
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: 1.2, 
                  delay: 0.4,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className="relative"
              >
                <motion.div 
                  className="relative rounded-2xl overflow-hidden glass-card p-2 glow-blue"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <img 
                    src={techStarImage} 
                    alt="TechStar Launchpad Competition"
                    className="w-full h-auto rounded-xl"
                  />
                  {/* Image overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent rounded-xl pointer-events-none" />
                </motion.div>
                
                {/* Decorative floating element */}
                <motion.div
                  className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-cyan-500/30 to-purple-600/30 rounded-full blur-2xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white" data-testid="text-roadmap-title">
              Дорожная карта
            </h2>
            <p className="text-xl text-gray-300">
              Путь от идеи до встречи с инвесторами
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto">
            {/* Desktop Timeline */}
            <div className="hidden md:block relative">
              {/* Connection Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 opacity-30" style={{ transform: 'translateY(-50%)' }} />
              
              <div className="grid grid-cols-5 gap-4">
                {roadmapStages.map((stage, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.15,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    whileHover={{ y: -10, transition: { duration: 0.3 } }}
                    className="relative"
                  >
                    <div className="glass-card rounded-lg p-6 hover-elevate h-full relative z-10" data-testid={`card-roadmap-${index}`}>
                      {/* Stage Number */}
                      <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br ${stage.color} flex items-center justify-center text-white font-bold text-lg glow-blue`}>
                        {index + 1}
                      </div>

                      {/* Icon */}
                      <div className="mt-6 mb-4 flex justify-center">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${stage.color} bg-opacity-20`}>
                          <stage.icon className="h-8 w-8 text-cyan-300" />
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="text-lg font-bold mb-2 text-white text-center">{stage.title}</h3>
                      {stage.sessions && (
                        <p className="text-cyan-400 text-sm font-semibold text-center mb-2">
                          {stage.sessions} {getDaysText(stage.sessions)}
                        </p>
                      )}
                      {stage.date && (
                        <p className="text-cyan-400 text-sm font-semibold text-center mb-2">
                          {stage.date}
                        </p>
                      )}
                      <p className="text-white text-sm text-center">{stage.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mobile Timeline */}
            <div className="md:hidden space-y-6">
              {roadmapStages.map((stage, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 0.6, 
                    delay: index * 0.12,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="relative pl-12"
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-8 w-10 h-10 rounded-full bg-gradient-to-br ${stage.color} flex items-center justify-center text-white font-bold`}>
                    {index + 1}
                  </div>
                  
                  {/* Connecting line */}
                  {index < roadmapStages.length - 1 && (
                    <div className="absolute left-5 top-16 w-0.5 h-full bg-gradient-to-b from-cyan-500 to-purple-500 opacity-30" />
                  )}

                  <div className="glass-card rounded-lg p-6 hover-elevate" data-testid={`card-roadmap-mobile-${index}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${stage.color} bg-opacity-20 flex-shrink-0`}>
                        <stage.icon className="h-6 w-6 text-cyan-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1 text-white">{stage.title}</h3>
                        {stage.sessions && (
                          <p className="text-cyan-400 text-sm font-semibold mb-1">
                            {stage.sessions} {getDaysText(stage.sessions)}
                          </p>
                        )}
                        {stage.date && (
                          <p className="text-cyan-400 text-sm font-semibold mb-1">
                            {stage.date}
                          </p>
                        )}
                        <p className="text-white text-sm">{stage.description}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Speakers Section */}
      <section id="speakers" className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white" data-testid="text-speakers-title">
              Спикеры
            </h2>
            <p className="text-xl text-gray-300">
              Предприниматели которые выступят в рамках серии от "Идеи до Единорога"
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {speakers.map((speaker, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: [0.22, 1, 0.36, 1]
                }}
                whileHover={{ y: -10, scale: 1.03, transition: { duration: 0.3 } }}
              >
                <div className="glass-card rounded-lg p-6 hover-elevate text-center h-full" data-testid={`card-speaker-${index}`}>
                  <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-cyan-400/30">
                    {speaker.image && <AvatarImage src={speaker.image} alt={speaker.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-600 text-white text-2xl">
                      {speaker.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-bold text-white mb-1">{speaker.name}</h3>
                  <p className="text-cyan-400 text-sm mb-2">{speaker.title}</p>
                  <p className="text-gray-400 text-xs">{speaker.expertise}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* More Speakers Coming Soon */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 text-center"
          >
            <div className="inline-block glass-card rounded-full px-8 py-4 border-2 border-cyan-400/30 glow-blue">
              <p className="text-cyan-300 font-semibold text-base md:text-lg" data-testid="text-more-speakers">
                Скоро будут объявлены новые спикеры
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Prizes Section */}
      <section id="prizes" className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="glass-card rounded-lg p-12 glow-blue"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-center space-y-4 mb-12"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white" data-testid="text-prizes-title">
                  Призы и возможности
                </h2>
                <p className="text-xl text-gray-300">
                  Победители получат реальные возможности для развития своих стартапов
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {prizes.map((prize, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.15 + 0.3,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    whileHover={{ y: -8, scale: 1.05, transition: { duration: 0.3 } }}
                    className="text-center space-y-4"
                  >
                    <motion.div 
                      className="inline-flex p-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-400/30"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <prize.icon className="h-12 w-12 text-cyan-300" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white">{prize.title}</h3>
                    <p className="text-gray-300">{prize.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-24 relative z-10 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Партнеры
            </h2>
            <p className="text-xl text-gray-300">
              При поддержке ведущих компаний и организаций
            </p>
          </motion.div>

          {/* Infinite Carousel */}
          <div className="relative">
            <div className="flex gap-12 animate-scroll">
              {[...partners, ...partners].map((partner, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="flex-shrink-0 w-48 h-24 flex items-center justify-center glass-card rounded-lg p-4"
                  style={{ backdropFilter: 'blur(10px)' }}
                >
                  <img 
                    src={partner} 
                    alt={`Partner ${index + 1}`}
                    className="max-w-full max-h-full object-contain opacity-90 hover:opacity-100 transition-opacity filter grayscale hover:grayscale-0"
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Become a Partner Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center mt-12"
          >
            <Button
              onClick={() => setPartnerDialogOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold px-8 py-6 text-lg border border-cyan-400/30"
              data-testid="button-become-partner"
            >
              Стать партнером
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Partner Dialog */}
      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent className="sm:max-w-[500px] glass-card border border-cyan-400/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Стать партнером
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-base pt-4">
              Мы всегда рады новым партнерам которые заинтересованы в поддержке и развитии молодежного предпринимательства в нашей стране!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-600/10 border border-cyan-400/20">
              <Mail className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <a 
                href="mailto:bogdanfom.1002@yandex.ru"
                className="text-white hover:text-cyan-300 transition-colors font-medium"
                data-testid="link-partner-email"
              >
                bogdanfom.1002@yandex.ru
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CTA Section */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="glass-card rounded-lg p-12 glow-blue"
            >
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-3xl md:text-4xl font-bold text-white mb-4"
              >
                Готовы начать свой путь к успеху?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="text-lg text-gray-300 mb-8"
              >
                Зарегистрируйтесь сейчас и станьте частью следующего поколения успешных предпринимателей
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg" 
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-xl shadow-cyan-500/30"
                  asChild
                >
                  <Link href="/register" data-testid="link-cta-register">
                    Зарегистрироваться на TechStar
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <p className="font-semibold text-lg text-white">TechStar Launchpad</p>
            <p className="text-gray-400">Предпринимательский Клуб Финансового Университета</p>
            <p className="text-sm text-gray-500">
              © 2025 Все права защищены
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
