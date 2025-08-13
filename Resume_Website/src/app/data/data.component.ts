import { Injectable } from '@angular/core';

export type HeaderSection = 'about'|'experience'|'projects'|'testimonials'|'portfolio';
export type Theme = 'dark'|'light'|'lava'|'constellation';

export interface Me {
  name: string;
  title: string;
  email: string;
  location: string;
  skills: string[];
}

export interface ExperienceItem {
  year: string;
  role: string;
  company: string;
  blurb: string;
}

export interface ProjectItem {
  title: string;
  desc: string;
  link: string;
  tags: string[];
}

export interface PortfolioGif { file: string; link: string; }
export interface PortfolioItem {
  videoName: string;
  videoLink: string;
  clientName: string;
  clientLink: string;
  viewCount: string;
  gifs: PortfolioGif[];
}

export interface TestimonialItem {
  quote: string;
  by: string;
}

export interface UIStrings {
  nav: {
    about: string;
    experience: string;
    projects: string;
    testimonials: string;
    portfolio: string;
    backToTop: string;
    dotsAria: string;
  };
  hero: {
    hi: string;
    subtitle: string;
    ctas: { download: string; contact: string; };
    cvPath: string;
  };
  about: { heading: string; lead: string; };
  experience: { heading: string; expandAria: string; };
  projects: { heading: string; readMoreText: string; ariaCarousel: string; };
  testimonials: { heading: string; };
  contact: {
    heading: string;
    lead: string;
    actions: { copyEmailAria: string; copyPhoneAria: string; openMailAria: string; };
    form: {
      name: string; email: string; message: string;
      placeholderName: string; placeholderEmail: string; placeholderMsg: string;
      submit: string;
    };
  };
  footer: { rights: string; copyrightHolder: string; };
  palette: { placeholder: string; hint: string; };
}

@Injectable({ providedIn: 'root' })
export class DataComponent {
  // Core profile
  readonly me: Me = {
    name: 'Connor Hogan',
    title: 'Software Engineer',
    email: '628cjh@gmail.com',
    location: 'Huntsville, AL',
    skills: ['Go', 'Python', 'C++', 'C', 'HTML', 'JavaScript', 'CSS', 'TypeScript', 'SCSS', 'Angular', 'Chart.js', 'D3', 'A11y']
  };

  readonly experience: ExperienceItem[] = [
    { 
      year: 'October 2024 — Present', 
      role: 'Software Engineer', 
      company: 'NASA Marshall Space Flight Center / Arcata Associates - Huntsville AL',
      blurb: 'Maintain communication networking systems on the ISS program.'
    },
    { 
      year: 'May 2023 — July 2023', 
      role: 'Software Engineer', 
      company: 'Lockheed Martin – Huntsville, AL',
      blurb: 'Designed, developed, and integrated THAAD Fire Control Software. Updated and maintained FPGA firmware.'
    },
    { 
      year: 'December 2021 — May 2023', 
      role: 'Software Engineer', 
      company: 'Northrop Grumman / Insight Global – Huntsville, AL',
      blurb: 'Developed and modified algorithms and support tools in C/C++, Go, Python, Ada, and MATLAB in a secure environment. Planned and executed team projects, created work packages, prototypes, and customer demos, and analyzed algorithm performance, subsystems, and interfaces.'
    },
    { 
      year: 'December 2019 — December 2021', 
      role: 'Mission Systems Engineer', 
      company: 'US Air Force – Offutt AFB, NE',
      blurb: 'Performed aircrew duties aboard the RC-135 reconnaissance platform. Operated, maintained, repaired, and tested airborne communications, electro-optical sensors, radar, computer, electronic protection (EP) systems, and electronic warfare (EW) systems.'
    }
  ];

  readonly portfolio: PortfolioItem[] = [
    {
      videoName: 'Hypixel Minecraft Server - Official Trailer (2022)',
      videoLink: 'https://www.youtube.com/watch?v=bkWHyz1MmaQ',
      clientName: 'Hypixel',
      clientLink: 'https://www.youtube.com/@Hypixel',
      viewCount: '435K views',
      gifs: [{ file: 'https://i.imgur.com/Tll5YAp.gif', link: 'https://www.youtube.com/watch?v=bkWHyz1MmaQ' }]
    },
    {
      videoName: "Lamborghini Vs World's Largest Shredder",
      videoLink: 'https://www.youtube.com/watch?v=vBpQ1SlfVtU',
      clientName: 'MrBeast',
      clientLink: 'https://www.youtube.com/@MrBeast',
      viewCount: '200M views',
      gifs: [
        { file: 'https://i.imgur.com/HV7IaLb.gif', link: 'https://www.youtube.com/watch?v=vBpQ1SlfVtU' },
        { file: 'https://i.imgur.com/X03rnjJ.gif', link: 'https://www.youtube.com/watch?v=vBpQ1SlfVtU' }
      ]
    },
    {
      videoName: "Dog Money Is Back. We're Doomed.",
      videoLink: 'https://youtu.be/L8ZZDkxV0Ws?si=Ph4Yjwdah_G2ejs4',
      clientName: 'Atrioc',
      clientLink: 'https://www.youtube.com/@atrioc',
      viewCount: '418K views',
      gifs: [{ file: 'https://i.imgur.com/g90gxgu.gif', link: 'https://youtu.be/L8ZZDkxV0Ws?si=Ph4Yjwdah_G2ejs4&t=220' }]
    },
    {
      videoName: 'I Created A $1,500 HITMAN Challenge to Find The World\'s Best Player.',
      videoLink: 'https://www.youtube.com/watch?v=1NzLGYRYHJo',
      clientName: 'Atrioc',
      clientLink: 'https://www.youtube.com/@atrioc',
      viewCount: '2.6M views',
      gifs: [{ file: 'https://i.imgur.com/25LaTGv.gif', link: 'https://www.youtube.com/watch?v=1NzLGYRYHJo' }]
    },
    {
      videoName: "The Writer's Strike is Over. Who Won?",
      videoLink: 'https://www.youtube.com/watch?v=-n9XC7f50vc',
      clientName: 'Atrioc',
      clientLink: 'https://www.youtube.com/watch?v=1NzLGYRYHJo',
      viewCount: '330K views',
      gifs: [{ file: 'https://i.imgur.com/sCmb6D2.gif', link: 'https://www.youtube.com/watch?v=-n9XC7f50vc' }]
    },
    {
      videoName: 'Unnamed Sneakpeak',
      videoLink: '',
      clientName: 'Atrioc',
      clientLink: '',
      viewCount: '0 views',
      gifs: [{ file: 'https://i.imgur.com/ELqCSW1.gif', link: '' }]
    },
  ];

  readonly projects: ProjectItem[] = [
    { 
      title: 'Auto Query', 
      desc: 'Queries YouTube, Reddit, and Twitch videos, displaying results on a locally hosted webpage frontend.', 
      link: 'https://github.com/QuiteLiterallyConnor/autoQuery', 
      tags: ['Go', 'HTML', 'JavaScript'] 
    },
    { 
      title: 'Bluetooth Manager', 
      desc: 'Provides functionality to control and scan Bluetooth devices using Golang.', 
      link: 'https://github.com/QuiteLiterallyConnor/BluetoothManager', 
      tags: ['Go'] 
    },
    { 
      title: 'Dark Monkey Project', 
      desc: 'Project to create a real-life Dart Monkey from Bloons Tower Defense.', 
      link: 'https://github.com/QuiteLiterallyConnor/DartMonkeyProject', 
      tags: ['C++', 'Go', 'Python', 'HTML', 'CSS', 'JavaScript'] 
    },
    { 
      title: 'Resume Website', 
      desc: 'Personal site powered by Angular and tasteful motion.', 
      link: 'https://github.com/QuiteLiterallyConnor/ResumeWebsite', 
      tags: ['Go', 'Angular', 'HTML', 'TypeScript', 'SCSS'] 
    },
    { 
      title: 'Angular Backgrounds', 
      desc: 'A repository of visually appealing Angular backgrounds.', 
      link: '#', // placeholder link
      tags: ['Angular'] 
    }
  ];

  // Testimonials
  readonly testimonials: TestimonialItem[] = [
    // { quote: 'Connor delivered my product as expected quickly and professionally.', by: 'Client' },
  ];

  readonly marqueeSkills: string[] = Array(12).fill([
    'Go', 'C', 'Python', 'HTML', 'JavaScript', 'CSS', 'TypeScript', 'SCSS', 'Angular', 'Chart.js', 'D3', 'A11y'
  ]).flat();

  // All other UI text
  readonly ui: UIStrings = {
    nav: {
      about: 'About',
      experience: 'Experience',
      projects: 'Projects',
      testimonials: 'Testimonials',
      portfolio: 'Portfolio',
      backToTop: 'Back to top',
      dotsAria: 'Section navigation'
    },
    hero: {
      hi: 'Hi, I’m',
      subtitle: 'I build robust full stack services for crisp web experiences.',
      ctas: { download: 'Download CV', contact: 'Contact' },
      cvPath: 'connor-hogan-resume-oct-2024.pdf'
    },
    about: {
      heading: 'About Me',
      lead: 'I’m a software engineer specializing in models & simulation and web development, creating reliable, efficient systems from backend logic to user-facing interfaces.'
    },
    experience: {
      heading: 'Experience',
      expandAria: 'Expand'
    },
    projects: {
      heading: 'Projects',
      readMoreText: 'Read More →',
      ariaCarousel: 'Projects carousel'
    },
    testimonials: {
      heading: 'Testimonials'
    },
    contact: {
      heading: 'Contact',
      lead: 'Let’s build something great together.',
      actions: {
        copyEmailAria: 'Copy email',
        copyPhoneAria: 'Copy phone',
        openMailAria: 'Open mail client'
      },
      form: {
        name: 'Name',
        email: 'Email',
        message: 'Message',
        placeholderName: 'Your name',
        placeholderEmail: 'you@example.com',
        placeholderMsg: 'What can I do for you?',
        submit: 'Send'
      }
    },
    footer: {
      rights: 'All rights reserved.',
      copyrightHolder: 'Connor Hogan'
    },
    palette: {
      placeholder: 'Type a command or search…',
      hint: 'Press Esc to close • ↑↓ to navigate • Enter to run'
    }
  };
}
