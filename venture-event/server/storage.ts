import { randomUUID } from "crypto";
import type {
  Event,
  InsertEvent,
  Registration,
  InsertRegistration,
  Startup,
  InsertStartup,
  Investor,
  InsertInvestor,
} from "@shared/schema";

export interface IStorage {
  // Events
  listEvents(): Event[];
  getEvent(id: string): Event | undefined;
  createEvent(data: InsertEvent): Event;

  // Registrations
  listRegistrations(eventId: string): Registration[];
  createRegistration(data: InsertRegistration): Registration;
  markAttendance(registrationId: string): Registration | undefined;

  // Startups
  listStartups(): Startup[];
  getStartup(id: string): Startup | undefined;
  createStartup(data: InsertStartup): Startup;

  // Investors
  listInvestors(): Investor[];
  getInvestor(id: string): Investor | undefined;
  createInvestor(data: InsertInvestor): Investor;
}

export class MemStorage implements IStorage {
  private events = new Map<string, Event>();
  private registrations = new Map<string, Registration>();
  private startups = new Map<string, Startup>();
  private investors = new Map<string, Investor>();

  constructor() {
    this.seed();
  }

  /* ------------------------------- Events -------------------------------- */
  listEvents(): Event[] {
    return [...this.events.values()].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
    );
  }
  getEvent(id: string) {
    return this.events.get(id);
  }
  createEvent(data: InsertEvent): Event {
    const today = new Date().toISOString().slice(0, 10);
    const event: Event = {
      id: randomUUID(),
      ...data,
      status: data.date >= today ? "upcoming" : "past",
    };
    this.events.set(event.id, event);
    return event;
  }

  /* ---------------------------- Registrations ---------------------------- */
  listRegistrations(eventId: string): Registration[] {
    return [...this.registrations.values()].filter(
      (r) => r.eventId === eventId,
    );
  }
  createRegistration(data: InsertRegistration): Registration {
    const reg: Registration = {
      id: randomUUID(),
      ...data,
      attendanceMarked: false,
      createdAt: new Date().toISOString(),
    };
    this.registrations.set(reg.id, reg);
    return reg;
  }
  markAttendance(registrationId: string): Registration | undefined {
    const reg = this.registrations.get(registrationId);
    if (!reg) return undefined;
    const updated = { ...reg, attendanceMarked: true };
    this.registrations.set(registrationId, updated);
    return updated;
  }

  /* ------------------------------ Startups ------------------------------- */
  listStartups(): Startup[] {
    return [...this.startups.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
  getStartup(id: string) {
    return this.startups.get(id);
  }
  createStartup(data: InsertStartup): Startup {
    const startup: Startup = {
      id: randomUUID(),
      ...data,
      logo: initials(data.name),
      members: [],
    };
    this.startups.set(startup.id, startup);
    return startup;
  }

  /* ------------------------------ Investors ------------------------------ */
  listInvestors(): Investor[] {
    return [...this.investors.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
  getInvestor(id: string) {
    return this.investors.get(id);
  }
  createInvestor(data: InsertInvestor): Investor {
    const investor: Investor = {
      id: randomUUID(),
      ...data,
      members: [],
    };
    this.investors.set(investor.id, investor);
    return investor;
  }

  /* -------------------------------- Seed --------------------------------- */
  private seed() {
    const e = (ev: Omit<Event, "id">): Event => {
      const id = randomUUID();
      const full = { id, ...ev };
      this.events.set(id, full);
      return full;
    };

    const pitch = e({
      name: "Autumn Demo Day 2026",
      date: "2026-10-15",
      time: "18:00",
      location: "Main Auditorium, Innovation Center",
      duration: "3h",
      eventType: "demo_day",
      description:
        "Ten of our most promising early-stage startups pitch live to a room of angels and venture funds, followed by open networking.",
      status: "upcoming",
      isFeatured: true,
      registrationOpen: true,
    });

    e({
      name: "Fundraising Fundamentals Workshop",
      date: "2026-09-03",
      time: "16:30",
      location: "Room B2, Business School",
      duration: "2h",
      eventType: "workshop",
      description:
        "A hands-on session covering cap tables, term sheets, and how to run a clean pre-seed round.",
      status: "upcoming",
      isFeatured: false,
      registrationOpen: true,
    });

    e({
      name: "Founders & Funders Mixer",
      date: "2026-09-20",
      time: "19:00",
      location: "Rooftop Lounge",
      duration: "2h30m",
      eventType: "networking",
      description:
        "Casual evening connecting first-time founders with active early-stage investors.",
      status: "upcoming",
      isFeatured: false,
      registrationOpen: true,
    });

    e({
      name: "Spring Tech Conference 2026",
      date: "2026-04-11",
      time: "10:00",
      location: "Grand Hall",
      duration: "6h",
      eventType: "conference",
      description:
        "A full day of talks on AI, climate tech, and the future of fintech with regional ecosystem leaders.",
      status: "past",
      isFeatured: false,
      registrationOpen: false,
    });

    // a couple of registrations on the upcoming demo day
    this.createRegistration({
      eventId: pitch.id,
      guestName: "Dana Whitfield",
      guestEmail: "dana@example.com",
    });
    this.createRegistration({
      eventId: pitch.id,
      guestName: "Marco Reyes",
      guestEmail: "marco@example.com",
    });

    const s = (st: Omit<Startup, "id" | "logo"> & { logo?: string }): Startup => {
      const id = randomUUID();
      const full: Startup = { id, logo: initials(st.name), ...st };
      this.startups.set(id, full);
      return full;
    };

    s({
      name: "Lumen Health",
      description:
        "AI triage assistant that helps clinics prioritise patient messages and cut response times in half.",
      website: "https://lumenhealth.example",
      vertical: "Healthtech",
      stage: "seed",
      techStack: "React, Python, FastAPI, PostgreSQL",
      hqCity: "Berlin",
      teamSize: 9,
      members: [
        { id: randomUUID(), name: "Sofia Klein", role: "founder", title: "CEO" },
        { id: randomUUID(), name: "Jonas Vogel", role: "cofounder", title: "CTO" },
      ],
    });

    s({
      name: "GridPilot",
      description:
        "Software that balances rooftop-solar microgrids in real time, smoothing demand for small utilities.",
      website: "https://gridpilot.example",
      vertical: "Climate / Energy",
      stage: "pre_seed",
      techStack: "TypeScript, Node.js, Rust, TimescaleDB",
      hqCity: "Lisbon",
      teamSize: 5,
      members: [
        { id: randomUUID(), name: "Ana Costa", role: "founder", title: "CEO" },
      ],
    });

    s({
      name: "Ledgerly",
      description:
        "Embedded accounting API that lets fintech apps offer bookkeeping without building it themselves.",
      website: "https://ledgerly.example",
      vertical: "Fintech",
      stage: "series_a",
      techStack: "Go, React, Kafka, PostgreSQL",
      hqCity: "London",
      teamSize: 24,
      members: [
        { id: randomUUID(), name: "Priya Nair", role: "founder", title: "CEO" },
        { id: randomUUID(), name: "Tom Bauer", role: "cofounder", title: "COO" },
      ],
    });

    s({
      name: "Cohere Learn",
      description:
        "Adaptive micro-courses for upskilling engineers, with spaced repetition baked in.",
      website: "https://coherelearn.example",
      vertical: "Edtech",
      stage: "mvp",
      techStack: "Next.js, Supabase",
      hqCity: "Warsaw",
      teamSize: 3,
      members: [
        { id: randomUUID(), name: "Kasia Lewandowska", role: "founder", title: "CEO" },
      ],
    });

    s({
      name: "Provndr",
      description:
        "Marketplace connecting independent restaurants directly with local farms to shorten supply chains.",
      website: "https://provndr.example",
      vertical: "Marketplace / Food",
      stage: "idea",
      techStack: "React Native, Firebase",
      hqCity: "Amsterdam",
      teamSize: 2,
      members: [
        { id: randomUUID(), name: "Liam de Vries", role: "founder", title: "CEO" },
      ],
    });

    const inv = (i: Omit<Investor, "id">): Investor => {
      const id = randomUUID();
      const full = { id, ...i };
      this.investors.set(id, full);
      return full;
    };

    inv({
      name: "Northwind Ventures",
      kind: "vc_fund",
      thesis:
        "We back pre-seed and seed founders building practical AI and fintech infrastructure for European SMBs. We love technical teams shipping fast.",
      description:
        "Early-stage fund investing across Europe with a focus on B2B software.",
      hqCity: "London",
      checkSizeMin: 150000,
      checkSizeMax: 1500000,
      stageFocus: ["pre_seed", "seed"],
      verticals: ["Fintech", "AI", "B2B SaaS"],
      members: [
        { id: randomUUID(), name: "Helen Park", role: "partner" },
        { id: randomUUID(), name: "Omar Haddad", role: "analyst" },
      ],
    });

    inv({
      name: "Greenfield Angels",
      kind: "angel",
      thesis:
        "Angel collective focused on climate, energy and sustainability. We invest at idea and pre-seed in mission-driven founders.",
      description: "A syndicate of operator-angels writing first cheques.",
      hqCity: "Lisbon",
      checkSizeMin: 25000,
      checkSizeMax: 250000,
      stageFocus: ["idea", "pre_seed"],
      verticals: ["Climate / Energy", "Hardware", "Marketplace / Food"],
      members: [{ id: randomUUID(), name: "Rui Almeida", role: "principal" }],
    });

    inv({
      name: "Meridian Growth",
      kind: "vc_fund",
      thesis:
        "Series A fund partnering with proven teams scaling fintech and healthtech across global markets.",
      description: "Growth-stage investor with a hands-on platform team.",
      hqCity: "Berlin",
      checkSizeMin: 2000000,
      checkSizeMax: 10000000,
      stageFocus: ["series_a"],
      verticals: ["Fintech", "Healthtech"],
      members: [{ id: randomUUID(), name: "Clara Fenn", role: "partner" }],
    });
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const storage: IStorage = new MemStorage();
