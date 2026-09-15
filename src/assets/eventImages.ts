import heroWorkshopImg from './images/events_hero_workshop_1789328170938.jpg';
import pythonSessionImg from './images/python_workshop_session_1789328186275.jpg';
import innovationHallImg from './images/innovation_hub_hall_1789328199550.jpg';
import networkingImg from './images/community_networking_1789328212287.jpg';
import webDevWorkshopImg from './images/web_dev_workshop_1789328742244.jpg';

export {
  heroWorkshopImg,
  pythonSessionImg,
  innovationHallImg,
  networkingImg,
  webDevWorkshopImg,
};

export interface EventGalleryPhoto {
  id: string;
  title: string;
  caption: string;
  category: string;
  src: string;
  alt: string;
}

export const EVENT_PHOTOS: EventGalleryPhoto[] = [
  {
    id: 'hero-workshop',
    title: 'Keynotes & Interactive Seminars',
    caption: 'Modern multimedia auditorium equipped for technical keynotes and regional tech conferences.',
    category: 'Conferences',
    src: heroWorkshopImg,
    alt: 'Participants attending a technical seminar in Nowshera',
  },
  {
    id: 'python-session',
    title: 'Hands-on Coding & Python Labs',
    caption: 'Interactive developer workshops covering Python programming, automation scripts, and data workflows.',
    category: 'Workshops',
    src: pythonSessionImg,
    alt: 'Attendee coding Python on laptop during a technical workshop',
  },
  {
    id: 'innovation-hall',
    title: 'Nowshera Tech Innovation Hub',
    caption: 'Premier tier-seated hall hosting university seminars, developer meetups, and founder talks.',
    category: 'Venues',
    src: innovationHallImg,
    alt: 'State-of-the-art seminar hall and conference venue in Nowshera',
  },
  {
    id: 'community-networking',
    title: 'Vibrant Community Networking',
    caption: 'Connecting local students, engineers, educators, and creative professionals across Khyber Pakhtunkhwa.',
    category: 'Community',
    src: networkingImg,
    alt: 'Participants networking and collaborating at Nowshera community event',
  },
];

/**
 * Returns the most fitting photo based on event title and description keywords
 */
export function getEventCoverImage(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase();

  if (text.includes('web') || text.includes('full-stack') || text.includes('fullstack') || text.includes('react') || text.includes('frontend') || text.includes('javascript') || text.includes('html') || text.includes('css')) {
    return webDevWorkshopImg;
  }
  if (text.includes('python') || text.includes('code') || text.includes('programming') || text.includes('data') || text.includes('automation')) {
    return pythonSessionImg;
  }
  if (text.includes('hall') || text.includes('hub') || text.includes('venue') || text.includes('summit')) {
    return innovationHallImg;
  }
  if (text.includes('network') || text.includes('community') || text.includes('meetup') || text.includes('social')) {
    return networkingImg;
  }

  return heroWorkshopImg;
}
